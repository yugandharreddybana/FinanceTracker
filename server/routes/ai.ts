import { Router, Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { verifyToken } from "../lib/auth.js";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// Startup validation for Gemini API Key
let genAI: any = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Authentication Middleware
const authMiddleware = (req: Request, res: Response, next: () => void) => {
  const authHeader = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!authHeader) return res.status(401).json({ error: "Missing authorization token" });
  
  const decoded = verifyToken(authHeader);
  if (!decoded) return res.status(401).json({ error: "Invalid or expired token" });
  
  (req as any).user = decoded;
  next();
};

const BACKEND_URL = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8080";
const BACKEND_API = `${BACKEND_URL}/api/finance`;

// Helper for calling internal backend tools
async function callBackend(path: string, method: string, body: any, userId: string, token: string) {
  const url = `${BACKEND_API}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-User-Id": userId
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Backend failed with ${response.status}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// 1. Smart Add Transaction NLP
// ---------------------------------------------------------------------------
router.post("/process-input", authMiddleware, async (req, res) => {
  try {
    const { input, savingsGoals } = req.body;
    if (!genAI) return res.status(503).json({ error: "AI service not configured" });

    const prompt = `Analyze this natural language input for financial data: "${input}". 
      Available Savings Goals: ${JSON.stringify(savingsGoals)}.
      Return as a JSON array of objects. Each object MUST have an "intent" field: "TRANSACTION" | "SAVINGS_GOAL" | "RECURRING_PAYMENT" | "LOAN" | "SAVINGS_TRANSFER".`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING, enum: ["TRANSACTION", "SAVINGS_GOAL", "RECURRING_PAYMENT", "LOAN", "SAVINGS_TRANSFER"] },
              merchant: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              date: { type: Type.STRING },
              category: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["income", "expense"] },
              confidence: { type: Type.NUMBER },
              name: { type: Type.STRING },
              target: { type: Type.NUMBER },
              emoji: { type: Type.STRING },
              deadline: { type: Type.STRING },
              frequency: { type: Type.STRING, enum: ["Monthly", "Weekly", "Annual"] },
              dayOfMonth: { type: Type.NUMBER },
              totalAmount: { type: Type.NUMBER },
              monthlyEMI: { type: Type.NUMBER },
              interestRate: { type: Type.NUMBER },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              goalId: { type: Type.STRING }
            },
            required: ["intent"]
          }
        }
      }
    });

    res.json(JSON.parse(result.response.text()));
  } catch (error: any) {
    console.error("AI Process Input Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Batch Categorization
// ---------------------------------------------------------------------------
router.post("/categorize", authMiddleware, async (req, res) => {
  try {
    const { targets } = req.body;
    if (!genAI) return res.status(503).json({ error: "AI service not configured" });

    const prompt = `Categorize these transactions: ${JSON.stringify(targets)}. 
      Available categories: Housing, Food & Drink, Transport, Entertainment, Shopping, Electronics, Utilities, Health, Education, Others.
      Return as a JSON object where keys are transaction IDs and values are arrays of objects with "category" and "confidence" (0-1).`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          additionalProperties: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ["category", "confidence"]
            }
          }
        }
      }
    });

    res.json(JSON.parse(result.response.text()));
  } catch (error: any) {
    console.error("AI Categorization Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 3. File Analysis (Bill/Statement OCR)
// ---------------------------------------------------------------------------
router.post("/analyze-file", authMiddleware, async (req, res) => {
  try {
    const { base64Data, mimeType, type } = req.body;
    if (!genAI) return res.status(503).json({ error: "AI service not configured" });

    const prompt = type === 'bill' 
      ? "Analyze this bill/receipt and extract the merchant, amount, date, and category. Return as a JSON array of transactions."
      : "Analyze this bank statement and extract all transactions. Return as a JSON array of transactions.";

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType } }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              merchant: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              date: { type: Type.STRING },
              category: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ["merchant", "amount", "date", "confidence"]
          }
        }
      }
    });

    res.json(JSON.parse(result.response.text()));
  } catch (error: any) {
    console.error("AI File Analysis Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 4. AI Oracle Chat (Tool-calling supported)
// ---------------------------------------------------------------------------
router.post("/oracle", authMiddleware, async (req, res) => {
  try {
    const { message, history } = req.body;
    const { uid, name } = (req as any).user;
    const token = req.headers.authorization?.split(' ')[1]!;

    if (!genAI) return res.status(503).json({ error: "AI service not configured" });

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: `You are the Yugi Oracle, a premium financial AI. The user's name is ${name}. Today's date is ${new Date().toISOString().split('T')[0]}.`
    });

    const tools = [
      {
        functionDeclarations: [
          {
            name: "get_transactions",
            description: "Get all financial transactions",
            parameters: { type: "OBJECT", properties: {} }
          },
          {
            name: "get_accounts",
            description: "Get all bank accounts and balances",
            parameters: { type: "OBJECT", properties: {} }
          },
          {
            name: "create_transaction",
            description: "Record a new financial transaction",
            parameters: {
              type: "OBJECT",
              properties: {
                merchant: { type: "STRING" },
                amount: { type: "NUMBER" },
                currency: { type: "STRING" },
                date: { type: "STRING" },
                category: { type: "STRING" },
                type: { type: "STRING", enum: ["EXPENSE", "INCOME"] },
                account: { type: "STRING" }
              },
              required: ["merchant", "amount", "type"]
            }
          }
        ]
      }
    ];

    const chat = model.startChat({
      history: history.map((h: any) => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.content }]
      })),
      tools
    });

    let result = await chat.sendMessage(message);
    let response = result.response;
    let calls = response.functionCalls();

    while (calls && calls.length > 0) {
      const toolResponses = await Promise.all(calls.map(async (call: any) => {
        let content: any = null;
        try {
          if (call.name === "get_transactions") {
            content = await callBackend("/transactions", "GET", null, uid, token);
          } else if (call.name === "get_accounts") {
            content = await callBackend("/accounts", "GET", null, uid, token);
          } else if (call.name === "create_transaction") {
            content = await callBackend("/transactions", "POST", call.args, uid, token);
          }
        } catch (e: any) {
          content = { error: e.message };
        }
        return {
          functionResponse: {
            name: call.name,
            response: { content }
          }
        };
      }));

      result = await chat.sendMessage(toolResponses);
      response = result.response;
      calls = response.functionCalls();
    }

    res.json({ content: response.text() });
  } catch (error: any) {
    console.error("AI Oracle Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Existing Endpoints (Refactored with Auth Middleware)
// ---------------------------------------------------------------------------
router.post("/insights", authMiddleware, async (req, res) => {
  try {
    if (!genAI) return res.status(503).json({ error: "AI service not configured" });
    const { transactions, selectedBank } = req.body;
    
    const prompt = `Based on these transactions: ${JSON.stringify(transactions)}, generate 4 personalized financial insights. 
    ${selectedBank !== 'ALL' ? `Focus specifically on transactions related to the account: ${selectedBank}.` : ''}
    Return them as a JSON array of objects with fields: id (string), type ('ALERT' | 'WIN' | 'TIP' | 'TREND'), title (string), description (string), date (string).`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    
    res.json(JSON.parse(result.response.text()));
  } catch (error: any) {
    console.error("AI Insights Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/chat", authMiddleware, async (req, res) => {
  // Keeping this for generic chat or refactoring it later
  try {
    if (!genAI) return res.status(503).json({ error: "AI service not configured" });
    const { message, history, transactions } = req.body;
    const { name } = (req as any).user;
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: `You are the Yugi Oracle, a premium financial AI. The user's name is ${name}.`
    });

    const contents = [
      ...history.map((h: any) => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.content }]
      })),
      {
        role: 'user',
        parts: [{ text: `Context: ${JSON.stringify(transactions)}\n\nUser message: ${message}` }]
      }
    ];

    const result = await model.generateContent({ contents });
    res.json({ content: result.response.text() });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/forecast", authMiddleware, async (req, res) => {
  try {
    if (!genAI) return res.status(503).json({ error: "AI service not configured" });
    const { currentNetWorth, monthlySavings, riskProfile } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: `Forecast net worth for 5, 10, and 20 years. Current: ${currentNetWorth}, Savings: ${monthlySavings}, Risk: ${riskProfile}.` }]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(result.response.text()));
  } catch (error: any) {
    console.error("AI Forecast Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/tax-suggestions", authMiddleware, async (req, res) => {
  try {
    if (!genAI) return res.status(503).json({ error: "AI service not configured" });
    const { spendingData } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: `Provide tax optimization suggestions based on: ${JSON.stringify(spendingData)}` }]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(result.response.text()));
  } catch (error: any) {
    console.error("AI Tax Suggestions Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export { router as aiRouter };

