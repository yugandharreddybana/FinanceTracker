import { Router, Request, Response } from "express";
import { verifyToken } from "../lib/auth.js";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// ---------------------------------------------------------------------------
// NVIDIA NIM — OpenAI-compatible client
// Base URL: https://integrate.api.nvidia.com/v1
// Model: meta/llama-3.3-70b-instruct
//   - Best-in-class for structured JSON output + tool/function calling
//   - Handles financial NLP, categorisation, chat, forecasting, tax
//   - OpenAI-compatible: works with standard fetch, no SDK needed
//   - Free tier available at build.nvidia.com
// ---------------------------------------------------------------------------

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

if (!NVIDIA_API_KEY) {
  console.warn("[AI] WARNING: NVIDIA_API_KEY is not set. All AI endpoints will return 503.");
}

// ---------------------------------------------------------------------------
// Core helper — calls NVIDIA NIM with the OpenAI chat completions API
// ---------------------------------------------------------------------------

interface NvidiaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface NvidiaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

async function nvidiaChat(
  messages: NvidiaMessage[],
  opts: {
    jsonMode?: boolean;
    tools?: NvidiaTool[];
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<{ text: string; toolCalls?: any[] }> {
  if (!NVIDIA_API_KEY) throw new Error("AI service not configured — NVIDIA_API_KEY is missing");

  const body: Record<string, unknown> = {
    model: NVIDIA_MODEL,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2048,
    stream: false,
  };

  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  if (opts.tools && opts.tools.length > 0) {
    body.tools = opts.tools;
    body.tool_choice = "auto";
  }

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`NVIDIA API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice) throw new Error("Empty response from NVIDIA NIM");

  // Handle tool call responses
  if (choice.finish_reason === "tool_calls" && choice.message?.tool_calls) {
    return { text: choice.message.content || "", toolCalls: choice.message.tool_calls };
  }

  return { text: choice.message?.content || "" };
}

// Safe JSON parse — returns null on failure
function safeJson(text: string): any {
  try {
    // Strip markdown code fences if model wraps JSON in ```json ... ```
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Authentication Middleware
// ---------------------------------------------------------------------------

const authMiddleware = (req: Request, res: Response, next: () => void) => {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if ((req as any).cookies?.auth_token) {
    token = (req as any).cookies.auth_token;
  }
  if (!token) return res.status(401).json({ error: "Missing authorization token" });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Invalid or expired token" });
  (req as any).user = decoded;
  next();
};

const BACKEND_URL = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8080";
const BACKEND_API = `${BACKEND_URL}/api/finance`;

async function callBackend(path: string, method: string, body: any, userId: string, token: string) {
  const url = `${BACKEND_API}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-User-Id": userId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Backend failed with ${response.status}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// 1. Smart Add Transaction NLP
// ---------------------------------------------------------------------------

router.post("/process-input", authMiddleware, async (req, res) => {
  try {
    const { input, savingsGoals } = req.body;
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    const { text } = await nvidiaChat(
      [
        {
          role: "system",
          content:
            `You are a financial data extraction assistant. Parse natural language input into structured JSON. ` +
            `Available savings goals: ${JSON.stringify(savingsGoals || [])}. ` +
            `Return ONLY a valid JSON array. Each object must have an "intent" field: ` +
            `"TRANSACTION" | "SAVINGS_GOAL" | "RECURRING_PAYMENT" | "LOAN" | "SAVINGS_TRANSFER". ` +
            `For TRANSACTION: include merchant (string), amount (number), date (YYYY-MM-DD), category (string), type ("income"|"expense"), confidence (0-1). ` +
            `For SAVINGS_GOAL: include name, target (number), emoji, deadline (YYYY-MM-DD). ` +
            `For RECURRING_PAYMENT: include name, amount, frequency ("Monthly"|"Weekly"|"Annual"), dayOfMonth (number). ` +
            `For LOAN: include name, totalAmount, monthlyEMI, interestRate, startDate, endDate. ` +
            `For SAVINGS_TRANSFER: include goalId (string), amount (number). `,
        },
        { role: "user", content: input },
      ],
      { jsonMode: true, temperature: 0.1 }
    );

    const parsed = safeJson(text);
    if (!parsed) {
      console.error("[process-input] Failed to parse JSON from model:", text);
      return res.status(500).json({ error: "AI returned invalid JSON" });
    }
    const result = Array.isArray(parsed) ? parsed : parsed.items || parsed.transactions || [parsed];
    res.json(result);
  } catch (error: any) {
    console.error("AI Process Input Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Batch Categorization
// ---------------------------------------------------------------------------

router.post("/categorize", authMiddleware, async (req, res) => {
  try {
    const { targets } = req.body;
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });
    if (!Array.isArray(targets) || targets.length === 0) return res.json({});

    const { text } = await nvidiaChat(
      [
        {
          role: "system",
          content:
            `You are a financial transaction categorizer. ` +
            `Categorize each transaction into one of: Housing, Food & Drink, Transport, Entertainment, Shopping, Electronics, Utilities, Health, Education, Others. ` +
            `Return ONLY a valid JSON object where keys are transaction IDs and values are arrays of objects with "category" (string) and "confidence" (0.0-1.0). ` +
            `Example: { "txn-1": [{ "category": "Food & Drink", "confidence": 0.95 }] }`,
        },
        {
          role: "user",
          content: `Categorize these transactions: ${JSON.stringify(
            targets.map((t: any) => ({ id: t.id, merchant: t.merchant, amount: t.amount, currentCategory: t.category }))
          )}`,
        },
      ],
      { jsonMode: true, temperature: 0.1 }
    );

    const parsed = safeJson(text);
    if (!parsed) {
      console.error("[categorize] Failed to parse JSON:", text);
      return res.status(500).json({ error: "AI returned invalid JSON" });
    }
    res.json(parsed);
  } catch (error: any) {
    console.error("AI Categorization Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 3. File Analysis (Bill/Statement — text extraction only, no vision)
// Note: Llama 3.3 70B is text-only. For image files, we extract text client-side
// and send the text content here. base64Data is treated as pre-extracted text.
// ---------------------------------------------------------------------------

router.post("/analyze-file", authMiddleware, async (req, res) => {
  try {
    const { base64Data, mimeType, type } = req.body;
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    // If it's an image mime type, we can't process it with a text model — return empty
    const isImage = mimeType?.startsWith("image/");
    let content = base64Data;

    if (isImage) {
      // For images: client should use OCR or send extracted text.
      // Return a helpful error so the frontend can handle it gracefully.
      return res.status(422).json({
        error: "Image file analysis requires text extraction first. Please upload a PDF or text-based statement.",
        transactions: [],
      });
    }

    // Decode base64 text content (PDF text, CSV, etc.)
    try {
      content = Buffer.from(base64Data, "base64").toString("utf-8");
    } catch {
      content = base64Data; // use as-is if not base64
    }

    const systemPrompt =
      type === "bill"
        ? `You are a bill/receipt parser. Extract the merchant, amount, date, and category from the provided text. Return ONLY a valid JSON array of transaction objects with fields: merchant (string), amount (number), date (YYYY-MM-DD), category (string), type ("expense"), confidence (0-1).`
        : `You are a bank statement parser. Extract ALL transactions from the provided text. Return ONLY a valid JSON array of transaction objects with fields: merchant (string), amount (number, negative for debits), date (YYYY-MM-DD), category (string), type ("income"|"expense"), confidence (0-1).`;

    const { text } = await nvidiaChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this ${type}: ${content.slice(0, 8000)}` },
      ],
      { jsonMode: true, temperature: 0.1, maxTokens: 3000 }
    );

    const parsed = safeJson(text);
    if (!parsed) return res.status(500).json({ error: "AI returned invalid JSON" });
    const result = Array.isArray(parsed) ? parsed : parsed.transactions || [];
    res.json(result);
  } catch (error: any) {
    console.error("AI File Analysis Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 4. AI Oracle Chat with Tool Calling
// ---------------------------------------------------------------------------

router.post("/oracle", authMiddleware, async (req, res) => {
  try {
    const { message, history } = req.body;
    const { uid, name } = (req as any).user;
    const token = req.headers.authorization?.split(" ")[1] ||
      (req as any).cookies?.auth_token || "";

    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    const tools: NvidiaTool[] = [
      {
        type: "function",
        function: {
          name: "get_transactions",
          description: "Get all financial transactions for the user",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "get_accounts",
          description: "Get all bank accounts and their balances",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "create_transaction",
          description: "Record a new financial transaction (expense or income)",
          parameters: {
            type: "object",
            properties: {
              merchant: { type: "string", description: "Merchant or income source name" },
              amount: { type: "number", description: "Transaction amount" },
              currency: { type: "string", description: "Currency code e.g. EUR, USD, INR" },
              date: { type: "string", description: "Date in YYYY-MM-DD format" },
              category: { type: "string", description: "Category e.g. Food, Transport, Rent" },
              type: { type: "string", enum: ["EXPENSE", "INCOME"] },
              account: { type: "string", description: "Bank account name" },
            },
            required: ["merchant", "amount", "type"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_budgets",
          description: "Get all budget categories and their limits and spending",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "get_savings_goals",
          description: "Get all savings goals and their progress",
          parameters: { type: "object", properties: {} },
        },
      },
    ];

    const systemMessage: NvidiaMessage = {
      role: "system",
      content:
        `You are the Yugi Oracle, a premium personal financial AI assistant. ` +
        `The user's name is ${name}. Today's date is ${new Date().toISOString().split("T")[0]}. ` +
        `You have access to tools to read the user's real financial data. ` +
        `Always use tools to get current data before answering questions about balances, transactions, or budgets. ` +
        `Be concise, insightful, and proactive in spotting financial patterns. ` +
        `Format currency amounts clearly. Never make up financial data.`,
    };

    const messages: NvidiaMessage[] = [
      systemMessage,
      ...(history || []).map((h: any) => ({
        role: (h.role === "ai" ? "assistant" : "user") as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    // Agentic loop — handle tool calls until model gives a final text response
    let loopMessages = [...messages];
    let finalText = "";
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const response = await nvidiaChat(loopMessages, { tools, temperature: 0.3 });

      if (!response.toolCalls || response.toolCalls.length === 0) {
        finalText = response.text;
        break;
      }

      // Append assistant message with tool calls
      loopMessages.push({
        role: "assistant",
        content: response.text || "",
        ...(response.toolCalls ? { tool_calls: response.toolCalls } : {}),
      } as any);

      // Execute each tool call and append results
      for (const toolCall of response.toolCalls) {
        const fnName = toolCall.function?.name;
        let toolResult: any = null;

        try {
          const args = JSON.parse(toolCall.function?.arguments || "{}");
          if (fnName === "get_transactions") {
            toolResult = await callBackend("/transactions", "GET", null, uid, token);
          } else if (fnName === "get_accounts") {
            toolResult = await callBackend("/accounts", "GET", null, uid, token);
          } else if (fnName === "get_budgets") {
            toolResult = await callBackend("/budgets", "GET", null, uid, token);
          } else if (fnName === "get_savings_goals") {
            toolResult = await callBackend("/savings-goals", "GET", null, uid, token);
          } else if (fnName === "create_transaction") {
            toolResult = await callBackend("/transactions", "POST", args, uid, token);
          } else {
            toolResult = { error: `Unknown tool: ${fnName}` };
          }
        } catch (e: any) {
          toolResult = { error: e.message };
        }

        loopMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        } as any);
      }
    }

    if (!finalText) finalText = "I was unable to complete the request. Please try again.";
    res.json({ content: finalText });
  } catch (error: any) {
    console.error("AI Oracle Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 5. AI Insights
// ---------------------------------------------------------------------------

router.post("/insights", authMiddleware, async (req, res) => {
  try {
    const { transactions, selectedBank } = req.body;
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    const bankFilter = selectedBank !== "ALL" ? `Focus on transactions from account: ${selectedBank}.` : "";

    const { text } = await nvidiaChat(
      [
        {
          role: "system",
          content:
            `You are a financial insights generator. Analyze the user's transactions and generate exactly 4 personalized insights. ` +
            `${bankFilter} ` +
            `Return ONLY a valid JSON array of exactly 4 objects with fields: ` +
            `id (string, e.g. "insight-1"), type (one of: "ALERT"|"WIN"|"TIP"|"TREND"), title (string, max 60 chars), description (string, max 150 chars), date (today's date YYYY-MM-DD).`,
        },
        {
          role: "user",
          content: `Analyze these transactions and give me 4 insights: ${JSON.stringify(
            (transactions || []).slice(0, 50) // cap to avoid token overflow
          )}`,
        },
      ],
      { jsonMode: true, temperature: 0.4 }
    );

    const parsed = safeJson(text);
    if (!parsed) return res.status(500).json({ error: "AI returned invalid JSON" });
    const result = Array.isArray(parsed) ? parsed : parsed.insights || [];
    res.json(result);
  } catch (error: any) {
    console.error("AI Insights Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Generic AI Chat
// ---------------------------------------------------------------------------

router.post("/chat", authMiddleware, async (req, res) => {
  try {
    const { message, history, transactions } = req.body;
    const { name } = (req as any).user;
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    const messages: NvidiaMessage[] = [
      {
        role: "system",
        content:
          `You are the Yugi Oracle, a premium personal financial AI. The user's name is ${name}. ` +
          `Today is ${new Date().toISOString().split("T")[0]}. ` +
          `Here is the user's recent transaction context: ${JSON.stringify((transactions || []).slice(0, 30))}.`,
      },
      ...(history || []).map((h: any) => ({
        role: (h.role === "ai" ? "assistant" : "user") as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const { text } = await nvidiaChat(messages, { temperature: 0.5 });
    res.json({ content: text });
  } catch (error: any) {
    console.error("AI Chat Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 7. Forecast
// ---------------------------------------------------------------------------

router.post("/forecast", authMiddleware, async (req, res) => {
  try {
    const { currentNetWorth, monthlySavings, riskProfile } = req.body;
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    const { text } = await nvidiaChat(
      [
        {
          role: "system",
          content:
            `You are a financial forecasting model. Given the user's current financial data, project net worth at 5, 10, and 20 year horizons. ` +
            `Return ONLY a valid JSON object with fields: ` +
            `years5 (number), years10 (number), years20 (number), summary (string, max 200 chars), assumptions (array of strings).`,
        },
        {
          role: "user",
          content: `Current net worth: ${currentNetWorth}. Monthly savings: ${monthlySavings}. Risk profile: ${riskProfile}.`,
        },
      ],
      { jsonMode: true, temperature: 0.2 }
    );

    const parsed = safeJson(text);
    if (!parsed) return res.status(500).json({ error: "AI returned invalid JSON" });
    res.json(parsed);
  } catch (error: any) {
    console.error("AI Forecast Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 8. Tax Suggestions
// ---------------------------------------------------------------------------

router.post("/tax-suggestions", authMiddleware, async (req, res) => {
  try {
    const { spendingData } = req.body;
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    const { text } = await nvidiaChat(
      [
        {
          role: "system",
          content:
            `You are a tax optimization advisor. Analyze the user's spending and income data and provide actionable tax optimization suggestions. ` +
            `Return ONLY a valid JSON array of suggestion objects with fields: ` +
            `title (string), description (string, max 200 chars), estimatedSaving (string), category (string), priority ("HIGH"|"MEDIUM"|"LOW").`,
        },
        {
          role: "user",
          content: `Analyze and provide tax suggestions for: ${JSON.stringify(spendingData)}`,
        },
      ],
      { jsonMode: true, temperature: 0.3 }
    );

    const parsed = safeJson(text);
    if (!parsed) return res.status(500).json({ error: "AI returned invalid JSON" });
    const result = Array.isArray(parsed) ? parsed : parsed.suggestions || [];
    res.json(result);
  } catch (error: any) {
    console.error("AI Tax Suggestions Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export { router as aiRouter };
