import { Router, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { authMiddleware } from "../middleware/auth.js";
import {
  normalizeProcessInputItems,
  sortBankAccountsFirst,
  type SmartAccount,
  type SmartBudget,
  type SmartGoal,
} from "../lib/smartAddNormalize.js";
const router = Router();

const IS_PROD_AI = process.env.NODE_ENV === "production";
const STRICT_AI_RATE_LIMIT =
  IS_PROD_AI || process.env.STRICT_AI_RATE_LIMIT === "true";

/** Avoid leaking NVIDIA/upstream messages or stack fragments to browsers in production. */
function aiPublicError(err: unknown): string {
  if (!IS_PROD_AI) {
    return err instanceof Error ? err.message : String(err);
  }
  return "AI request failed. Please try again later.";
}

const MAX_CATEGORIZE_TARGETS = 100;

// Phase3.0008: per-user rate limit on costly LLM endpoints.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: STRICT_AI_RATE_LIMIT ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req as any).user?.uid || req.ip || "anon",
  message: { error: "AI rate limit exceeded. Please try again shortly." },
});

// Phase3.0008: bound history/transaction context shipped to the LLM so a 2 MB
// body can't multiply the per-call token cost.
const MAX_HISTORY = 20;
const MAX_CONTEXT_TX = 30;
const MAX_CONTEXT_ACCOUNTS = 40;
const MAX_CONTEXT_BUDGETS = 40;
const MAX_CONTEXT_GOALS = 30;
const MAX_CONTEXT_LOANS = 24;
const MAX_CONTEXT_RECURRING = 40;
const MAX_CONTEXT_INVESTMENTS = 40;
const MAX_CONTEXT_INCOME = 30;
const MAX_NW_KEYS = 16;
const MAX_CUSTOM_CATEGORIES = 45;
const MAX_MONTHLY_TREND_ROWS = 8;

function slimBankAccountsForPrompt(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_CONTEXT_ACCOUNTS).map((item: any) => ({
    name: typeof item?.name === "string" ? item.name : "Account",
    bank: typeof item?.bank === "string" ? item.bank : "",
    type: typeof item?.type === "string" ? item.type : "",
    balance:
      typeof item?.balance === "number" && Number.isFinite(item.balance) ? item.balance : 0,
    currency: typeof item?.currency === "string" ? item.currency : "INR",
    isPrimary: Boolean(item?.isPrimary),
    ...(typeof item?.creditLimit === "number" && Number.isFinite(item.creditLimit)
      ? { creditLimit: item.creditLimit }
      : {}),
  }));
}

function slimBudgetsForPrompt(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_CONTEXT_BUDGETS).map((item) => {
    const b = item as Record<string, unknown>;
    return {
      category: typeof b.category === "string" ? b.category : "",
      limit: typeof b.limit === "number" && Number.isFinite(b.limit) ? b.limit : 0,
      spent: typeof b.spent === "number" && Number.isFinite(b.spent) ? b.spent : 0,
      currency: typeof b.currency === "string" ? b.currency : "INR",
      period: typeof b.period === "string" ? b.period : "",
    };
  });
}

function slimSavingsGoalsForPrompt(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_CONTEXT_GOALS).map((item) => {
    const g = item as Record<string, unknown>;
    return {
      name: typeof g.name === "string" ? g.name : "",
      target: typeof g.target === "number" && Number.isFinite(g.target) ? g.target : 0,
      current: typeof g.current === "number" && Number.isFinite(g.current) ? g.current : 0,
      deadline: typeof g.deadline === "string" ? g.deadline : "",
      currency: typeof g.currency === "string" ? g.currency : "INR",
    };
  });
}

function slimLoansForPrompt(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_CONTEXT_LOANS).map((item) => {
    const l = item as Record<string, unknown>;
    return {
      name: typeof l.name === "string" ? l.name : "",
      remainingAmount:
        typeof l.remainingAmount === "number" && Number.isFinite(l.remainingAmount)
          ? l.remainingAmount
          : 0,
      monthlyEMI: typeof l.monthlyEMI === "number" && Number.isFinite(l.monthlyEMI) ? l.monthlyEMI : 0,
      interestRate:
        typeof l.interestRate === "number" && Number.isFinite(l.interestRate) ? l.interestRate : 0,
      currency: typeof l.currency === "string" ? l.currency : "INR",
    };
  });
}

function slimRecurringForPrompt(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_CONTEXT_RECURRING).map((item) => {
    const r = item as Record<string, unknown>;
    return {
      name: typeof r.name === "string" ? r.name : "",
      amount: typeof r.amount === "number" && Number.isFinite(r.amount) ? r.amount : 0,
      frequency: typeof r.frequency === "string" ? r.frequency : "",
      status: typeof r.status === "string" ? r.status : "",
      category: typeof r.category === "string" ? r.category : "",
      currency: typeof r.currency === "string" ? r.currency : "INR",
      date: typeof r.date === "number" && Number.isFinite(r.date) ? r.date : 0,
    };
  });
}

function slimInvestmentsForPrompt(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_CONTEXT_INVESTMENTS).map((item) => {
    const i = item as Record<string, unknown>;
    const qty = typeof i.quantity === "number" && Number.isFinite(i.quantity) ? i.quantity : 0;
    const px = typeof i.currentPrice === "number" && Number.isFinite(i.currentPrice) ? i.currentPrice : 0;
    return {
      symbol: typeof i.symbol === "string" ? i.symbol : "",
      name: typeof i.name === "string" ? i.name : "",
      type: typeof i.type === "string" ? i.type : "",
      quantity: qty,
      currentPrice: px,
      currency: typeof i.currency === "string" ? i.currency : "INR",
      market_value: qty * px,
    };
  });
}

function slimIncomeSourcesForPrompt(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_CONTEXT_INCOME).map((item) => {
    const s = item as Record<string, unknown>;
    return {
      source: typeof s.source === "string" ? s.source : "",
      amount: typeof s.amount === "number" && Number.isFinite(s.amount) ? s.amount : 0,
      frequency: typeof s.frequency === "string" ? s.frequency : "",
      currency: typeof s.currency === "string" ? s.currency : "INR",
      lastReceivedDate: typeof s.lastReceivedDate === "string" ? s.lastReceivedDate : "",
      nextPaymentDate: typeof s.nextPaymentDate === "string" ? s.nextPaymentDate : "",
    };
  });
}

function slimNetWorthByCurrencyForPrompt(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, unknown> = {};
  const entries = Object.entries(raw as Record<string, unknown>).slice(0, MAX_NW_KEYS);
  for (const [k, v] of entries) {
    if (!v || typeof v !== "object") continue;
    const m = v as Record<string, unknown>;
    out[k] = {
      total: typeof m.total === "number" && Number.isFinite(m.total) ? m.total : 0,
      assets: typeof m.assets === "number" && Number.isFinite(m.assets) ? m.assets : 0,
      liabilities: typeof m.liabilities === "number" && Number.isFinite(m.liabilities) ? m.liabilities : 0,
      income: typeof m.income === "number" && Number.isFinite(m.income) ? m.income : 0,
      expenses: typeof m.expenses === "number" && Number.isFinite(m.expenses) ? m.expenses : 0,
      change: typeof m.change === "number" && Number.isFinite(m.change) ? m.change : 0,
    };
  }
  return out;
}

function slimHealthMetricsForPrompt(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, unknown> = {};
  const entries = Object.entries(raw as Record<string, unknown>).slice(0, MAX_NW_KEYS);
  for (const [k, v] of entries) {
    if (!v || typeof v !== "object") continue;
    const h = v as Record<string, unknown>;
    out[k] = {
      savingsRate: typeof h.savingsRate === "number" && Number.isFinite(h.savingsRate) ? h.savingsRate : 0,
      debtRatio: typeof h.debtRatio === "number" && Number.isFinite(h.debtRatio) ? h.debtRatio : 0,
      emergencyFund:
        typeof h.emergencyFund === "number" && Number.isFinite(h.emergencyFund) ? h.emergencyFund : 0,
      budgetAdherence:
        typeof h.budgetAdherence === "number" && Number.isFinite(h.budgetAdherence) ? h.budgetAdherence : 0,
      overallScore:
        typeof h.overallScore === "number" && Number.isFinite(h.overallScore) ? h.overallScore : 0,
    };
  }
  return out;
}

function slimPreferencesForPrompt(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const p = raw as Record<string, unknown>;
  return {
    currency: typeof p.currency === "string" ? p.currency : "INR",
    theme: typeof p.theme === "string" ? p.theme : "",
    language: typeof p.language === "string" ? p.language : "",
    notifications: Boolean(p.notifications),
  };
}

function slimCustomCategoriesForPrompt(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_CUSTOM_CATEGORIES).map((item) => {
    const c = item as Record<string, unknown>;
    return {
      name: typeof c.name === "string" ? c.name : "",
      color: typeof c.color === "string" ? c.color : "",
      icon: typeof c.icon === "string" ? c.icon : "",
    };
  });
}

function slimMonthlyTrendsForPrompt(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  const slice = raw.slice(-MAX_MONTHLY_TREND_ROWS);
  return slice.map((row) => {
    if (!row || typeof row !== "object") return {};
    const r = row as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      if (k === "month") {
        out.month = typeof v === "string" ? v : String(v ?? "");
        continue;
      }
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
      else if (typeof v === "string" && k.length < 32) out[k] = v.length > 64 ? `${v.slice(0, 64)}…` : v;
    }
    return out;
  });
}

function buildFinanceSnapshotFromBody(body: Record<string, unknown>): Record<string, unknown> {
  const fc = body.financeContext;
  const ctx = fc && typeof fc === "object" ? (fc as Record<string, unknown>) : null;
  return {
    budgets: slimBudgetsForPrompt(ctx?.budgets),
    savings_goals: slimSavingsGoalsForPrompt(ctx?.savingsGoals),
    loans: slimLoansForPrompt(ctx?.loans),
    recurring_payments: slimRecurringForPrompt(ctx?.recurringPayments),
    investments: slimInvestmentsForPrompt(ctx?.investments),
    income_sources: slimIncomeSourcesForPrompt(ctx?.incomeSources),
    net_worth_by_currency: slimNetWorthByCurrencyForPrompt(ctx?.netWorthByCurrency),
    health_metrics_by_currency: slimHealthMetricsForPrompt(ctx?.healthMetricsByCurrency),
    preferences: slimPreferencesForPrompt(ctx?.preferences),
    custom_categories: slimCustomCategoriesForPrompt(ctx?.customCategories),
    monthly_trends: slimMonthlyTrendsForPrompt(ctx?.monthlyTrends),
  };
}

function buildChatSystemContent(
  name: string,
  transactions: unknown[],
  accountsSlim: unknown[],
  financeSnapshot: Record<string, unknown>
): string {
  const accountsJson = JSON.stringify(accountsSlim);
  const txJson = JSON.stringify(transactions);
  const financeJson = JSON.stringify(financeSnapshot);

  return (
    `You are the Yugi Oracle, a premium personal financial assistant.\n` +
    `User: ${name}. Today: ${new Date().toISOString().split("T")[0]}.\n\n` +
    `You receive structured finance data below for reasoning only.\n\n` +
    `USER-FACING STYLE (critical):\n` +
    `- Never name or quote JSON keys, section headings from this prompt, datasets, snapshots, APIs, schemas, arrays, "empty array", or field paths (e.g. no "budgets property", no "finance snapshot").\n` +
    `- If something is missing, say it in plain language (e.g. "You have not added investment holdings in the app yet" / "There are no savings goals recorded yet").\n` +
    `- Never imply you are reading code or databases; speak as a coach who sees their finances at a glance.\n\n` +
    `CONTEXT A — linked bank-type accounts (${accountsSlim.length === 0 ? "none yet — suggest Bank Accounts page; do not say 'empty snapshot'" : "balances here override transaction math for totals"}):\n` +
    `${accountsJson}\n\n` +
    `CONTEXT B — budgets, goals, loans, subscriptions, holdings, income sources, aggregates, preferences, trends (may include empty lists):\n` +
    `${financeJson}\n\n` +
    `CONTEXT C — recent transactions (cash-flow detail; balance questions still prioritize CONTEXT A):\n` +
    `${txJson}\n\n` +
    `RULES:\n` +
    `- Balance / "how much do I have" / across accounts → infer from CONTEXT A only; sum per currency; list account name, type, balance; treat Credit as debt unless user wants one merged net figure.\n` +
    `- Map insights to CONTEXT B silently: budgets, savings goals, loans, recurring, investments/portfolio, income sources, category labels, monthly_trends, preferences.currency for default emphasis.\n` +
    `- Do not refuse balances because CONTEXT C is empty.\n` +
    `- Markdown to user (**bold** numbers, bullets); 2–4 short paragraphs; never invent holdings or transactions.`
  );
}

// Phase3.0006: any single create_transaction proposed by the LLM that exceeds
// this absolute cap is rejected outright. Below the cap the tool still does NOT
// auto-execute — it returns a pendingAction the user must confirm via UI.
const MAX_AI_TX_AMOUNT = 10000;
const MAX_AI_BUDGET_LIMIT = 250_000;
const MAX_AI_BUDGET_BATCH = 24;

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


const BACKEND_URL = process.env.JAVA_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8081";
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

router.post("/process-input", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { input, savingsGoals, accounts, budgets: budgetsBody } = req.body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: "Input is required and must be a string" });
    }
    if (input.trim().length === 0) {
      return res.status(400).json({ error: "Input cannot be empty" });
    }
    if (input.length > 2000) {
      return res.status(400).json({ error: "Input too long (max 2000 characters)" });
    }
    if (!NVIDIA_API_KEY) {
      return res.status(503).json({ error: "AI service not configured" });
    }

    const today = new Date().toISOString().split("T")[0];

    const systemPrompt = `You are an expert financial data extraction AI. Your job is to parse ANY natural language input — typed, voice-transcribed, messy, or shorthand — into precise structured JSON.

Today's date: ${today}

CONTEXT:
- User's savings goals: ${JSON.stringify(savingsGoals || [])}
- User's bank accounts: ${JSON.stringify(accounts || [])}

RULES:
1. Return ONLY a valid JSON object with a "results" key containing an array of parsed items.
2. Each item MUST have an "intent" field. Supported intents:
   TRANSACTION, BANK_ACCOUNT, SAVINGS_GOAL, RECURRING_PAYMENT, LOAN, SAVINGS_TRANSFER, BUDGET, LOAN_PAYMENT, DELETE_TRANSACTION
3. Be smart about voice transcription errors (e.g. "coffee for dollars" = "coffee $4", "fifty pounds" = £50).
4. When no date is specified, use today: ${today}.
5. When no currency is specified, infer from account context or default to the first account's currency (ISO 4217: EUR, USD, INR, GBP).
6. Amount is ALWAYS a positive number for TRANSACTION lines. The "type" field determines if it's income or expense.
7. **Critical:** If the user wants to **create / open / add a NEW bank account** (named account, opening balance, currency for that account), use intent **BANK_ACCOUNT** — never classify opening/initial balance as Salary or income TRANSACTION.
8. Do NOT map a **new** account name onto an unrelated existing account from CONTEXT.
9. For ambiguous inputs, pick the most likely intent with high confidence.

INTENT SCHEMAS:

BANK_ACCOUNT (new ledger account — NOT money movement):
  { "intent": "BANK_ACCOUNT", "accountName": string, "bank": string (institution or ""), "accountType": "Current"|"Savings"|"Credit", "balance": number (opening balance; 0 if omitted), "currency": string (ISO code), "confidence": 0.0-1.0 }
  Examples: "create new bank account named Primary in euros with balance 1000", "open a savings account Vacation Fund 5000 INR", "add account Ire Current EUR opening balance 250"

TRANSACTION (buying, spending, earning, paying, receiving money — existing cash flow, NOT new account setup):
  { "intent": "TRANSACTION", "merchant": string, "amount": number, "date": "YYYY-MM-DD", "category": string, "type": "income"|"expense", "currency": string, "account": string, "confidence": 0.0-1.0 }
  Examples: "coffee 5 euros", "paid rent 1200", "salary 5000 to HDFC", "got 200 from mom", "uber 12 dollars on Chase"

SAVINGS_GOAL (creating a new savings target):
  { "intent": "SAVINGS_GOAL", "name": string, "target": number, "emoji": string, "deadline": "YYYY-MM-DD"|"No deadline", "currency": string }
  Examples: "save for vacation 5000 by december", "new goal emergency fund 10000", "create savings goal for laptop 2000 euros"

BUDGET (setting a spending limit for a category):
  { "intent": "BUDGET", "category": string, "limit": number, "currency": string, "color": string }
  Examples: "set food budget to 500", "budget 200 for entertainment", "create a transport budget of 150 euros", "limit shopping to 300"

RECURRING_PAYMENT (subscriptions, bills, regular payments):
  { "intent": "RECURRING_PAYMENT", "name": string, "amount": number, "frequency": "Monthly"|"Weekly"|"Annual", "category": string, "currency": string, "dayOfMonth": number }
  Examples: "netflix 15.99 monthly", "add subscription spotify 9.99", "gym membership 50 per month", "insurance 200 annual"

LOAN (creating a new loan/debt):
  { "intent": "LOAN", "name": string, "totalAmount": number, "monthlyEMI": number, "interestRate": number, "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "category": string, "currency": string }
  Examples: "car loan 25000 at 5% interest EMI 500", "home loan 200000 for 20 years at 7%", "took a personal loan of 10000"

SAVINGS_TRANSFER (adding money to an existing savings goal):
  { "intent": "SAVINGS_TRANSFER", "goalId": string, "goalName": string, "amount": number }
  Examples: "add 500 to vacation fund", "transfer 1000 to emergency fund", "put 200 in laptop savings"

LOAN_PAYMENT (making a payment towards an existing loan):
  { "intent": "LOAN_PAYMENT", "loanName": string, "amount": number }
  Examples: "pay 500 towards car loan", "loan payment 1000 for home loan", "paid EMI for personal loan"

DELETE_TRANSACTION (removing an existing transaction):
  { "intent": "DELETE_TRANSACTION", "merchant": string, "amount": number, "date": "YYYY-MM-DD" }
  Examples: "delete the starbucks transaction", "remove the 50 dollar uber charge", "undo last coffee purchase"

CATEGORY MAPPING: Use these standard categories when possible:
Housing, Food, Food & Drink, Transport, Entertainment, Shopping, Electronics, Utilities, Health, Education, Travel, Gifts, Insurance, Investments, Salary, Freelance, Others

MULTI-ENTRY: The user may specify multiple items separated by semicolons, commas, "and", or line breaks. Parse each one separately.
Example: "coffee 5; uber 12; salary 5000" → 3 separate TRANSACTION items.`;

    const { text } = await nvidiaChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
      ],
      { jsonMode: true, temperature: 0.1, maxTokens: 3000 }
    );

    const parsed = safeJson(text);
    if (!parsed) {
      console.error("[process-input] Failed to parse JSON from model:", text);
      return res.status(500).json({ error: "AI returned invalid JSON" });
    }
    const result = Array.isArray(parsed)
      ? parsed
      : parsed.results || parsed.items || parsed.transactions || [parsed];
    let items: Record<string, unknown>[] = (Array.isArray(result) ? result : []).filter(
      (x): x is Record<string, unknown> => Boolean(x) && typeof x === "object" && !Array.isArray(x)
    );

    const goalsCtx: SmartGoal[] = Array.isArray(savingsGoals)
      ? savingsGoals
          .map((g: { id?: string; name?: string }) => ({
            id: String(g?.id ?? ""),
            name: String(g?.name ?? ""),
          }))
          .filter((g) => g.id !== "" || g.name !== "")
      : [];

    const accCtx: SmartAccount[] = Array.isArray(accounts)
      ? (accounts as Record<string, unknown>[]).map((a) => ({
          id: String(a.id ?? ""),
          name: typeof a.name === "string" ? a.name : "",
          bank: typeof a.bank === "string" ? a.bank : "",
          currency: typeof a.currency === "string" ? a.currency : undefined,
          isPrimary: Boolean(a.isPrimary),
        }))
      : [];

    const budgetCtx: SmartBudget[] = Array.isArray(budgetsBody)
      ? (budgetsBody as Record<string, unknown>[]).map((b) => ({
          id: String(b.id ?? ""),
          category: String(b.category ?? ""),
          limit: typeof b.limit === "number" ? b.limit : undefined,
          currency: typeof b.currency === "string" ? b.currency : undefined,
        }))
      : [];

    items = sortBankAccountsFirst(items);
    items = normalizeProcessInputItems(input, items, {
      savingsGoals: goalsCtx,
      accounts: accCtx,
      budgets: budgetCtx,
    });
    res.json(items);
  } catch (error: any) {
    console.error("AI Process Input Error:", error.message);
    res.status(500).json({ error: aiPublicError(error) });
  }
});

// ---------------------------------------------------------------------------
// 2. Batch Categorization
// ---------------------------------------------------------------------------

router.post("/categorize", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { targets } = req.body;
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });
    if (!Array.isArray(targets) || targets.length === 0) return res.json({});
    if (targets.length > MAX_CATEGORIZE_TARGETS) {
      return res.status(413).json({
        error: `Too many targets (max ${MAX_CATEGORIZE_TARGETS})`,
      });
    }

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
    res.status(500).json({ error: aiPublicError(error) });
  }
});

// ---------------------------------------------------------------------------
// 3. File Analysis (Bill/Statement — text extraction only, no vision)
// Note: Llama 3.3 70B is text-only. For image files, we extract text client-side
// and send the text content here. base64Data is treated as pre-extracted text.
// ---------------------------------------------------------------------------

router.post("/analyze-file", authMiddleware, aiLimiter, async (req, res) => {
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

    // Fix: expose truncation flag so the frontend can warn the user
    const isTruncated = content.length > 8000;
    const snippet = content.slice(0, 8000);

    const systemPrompt =
      type === "bill"
        ? `You are a bill/receipt parser. Extract the merchant, amount, date, and category from the provided text. Return ONLY a valid JSON array of transaction objects with fields: merchant (string), amount (number), date (YYYY-MM-DD), category (string), type ("expense"), confidence (0-1).`
        : `You are a bank statement parser. Extract ALL transactions from the provided text. Return ONLY a valid JSON array of transaction objects with fields: merchant (string), amount (number, negative for debits), date (YYYY-MM-DD), category (string), type ("income"|"expense"), confidence (0-1).`;

    const { text } = await nvidiaChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this ${type}: ${snippet}` },
      ],
      { jsonMode: true, temperature: 0.1, maxTokens: 3000 }
    );

    const parsed = safeJson(text);
    if (!parsed) return res.status(500).json({ error: "AI returned invalid JSON" });
    const result = Array.isArray(parsed) ? parsed : parsed.transactions || [];
    // Return truncation flag alongside results so the UI can surface a warning
    res.json({ transactions: result, truncated: isTruncated });
  } catch (error: any) {
    console.error("AI File Analysis Error:", error.message);
    res.status(500).json({ error: aiPublicError(error) });
  }
});

// ---------------------------------------------------------------------------
// 4. AI Oracle Chat with Tool Calling
// ---------------------------------------------------------------------------

router.post("/oracle", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const history = rawHistory.slice(-MAX_HISTORY);
    const { message } = req.body;
    const { uid, name } = (req as any).user;

    // Fix: guard against empty token before any callBackend invocation
    const token =
      req.headers.authorization?.split(" ")[1] ||
      (req as any).cookies?.auth_token ||
      "";
    if (!token) {
      return res.status(401).json({ error: "Missing token for backend call" });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: "Message too long (max 4000 characters)" });
    }
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    const tools: NvidiaTool[] = [
      {
        type: "function",
        function: {
          name: "get_transactions",
          description: "Get all financial transactions for the user including date, merchant, amount, category, type (income/expense), and associated bank account",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "get_accounts",
          description: "Get all bank accounts with their names, types (Current/Savings/Credit), balances, currencies, and which is the primary account",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "get_budgets",
          description: "Get all budget categories with their spending limits, current spent amounts, remaining amounts, and currency",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "get_savings_goals",
          description: "Get all savings goals with their target amounts, current saved amounts, progress percentage, deadlines, and currency",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "get_loans",
          description: "Get all loans with their total amount, remaining balance, monthly EMI, interest rate, start/end dates, and payment history",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "get_recurring_payments",
          description: "Get all recurring payments/subscriptions with their names, amounts, frequency, status (Active/Paused), and next due dates",
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
              amount: { type: "number", description: "Transaction amount (always positive)" },
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
          name: "create_budgets",
          description:
            "Create monthly budgets in the user's data store. Use when the user asks to add/set up budgets from scratch. Skips categories that already exist.",
          parameters: {
            type: "object",
            properties: {
              budgets: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string", description: "Budget category name e.g. Food & Drink" },
                    limit: { type: "number", description: "Monthly limit in the given currency" },
                    currency: {
                      type: "string",
                      description: "ISO 4217 currency e.g. EUR, INR, USD (omit only if unknown)",
                    },
                  },
                  required: ["category", "limit"],
                },
              },
            },
            required: ["budgets"],
          },
        },
      },
    ];

    const today = new Date().toISOString().split("T")[0];

    const systemMessage: NvidiaMessage = {
      role: "system",
      content:
        `You are the Yugi Oracle, a premium personal financial AI assistant with deep expertise in personal finance, budgeting, investing, debt management, and tax optimization.\n\n` +
        `USER: ${name}\nTODAY: ${today}\n\n` +
        `CAPABILITIES:\n` +
        `- You have direct access to the user's REAL financial data via tools. ALWAYS call tools before answering data questions.\n` +
        `- You can view: transactions, bank accounts, budgets, savings goals, loans, and recurring payments.\n` +
        `- You can draft new transactions (user must confirm in Smart Add).\n` +
        `- You can **create budgets** with the create_budgets tool — these are saved immediately.\n\n` +
        `CRITICAL TOOL USE:\n` +
        `- Questions about **balance**, **bank balances**, **total money**, **cash available**, **across accounts**, or **net liquid**: call **get_accounts** (not only get_transactions). Sum balances **per currency**. Treat **Credit** as debt — separate from deposit balances unless the user asks for one combined net figure.\n` +
        `- Transaction history alone cannot prove current account balances — never claim balances are "unknown" solely because transactions are empty.\n\n` +
        `RESPONSE GUIDELINES:\n` +
        `1. Be precise with numbers — always show exact amounts with currency symbols (€, $, £, ₹).\n` +
        `2. Use markdown formatting: **bold** for key figures, bullet points for lists, tables for comparisons.\n` +
        `3. When analyzing spending, group by category and show percentages.\n` +
        `4. Proactively spot: overspending, unusual transactions, savings opportunities, budget alerts.\n` +
        `5. When asked about net worth, sum all account balances minus total loan remaining amounts.\n` +
        `6. For forecasting questions, use actual data trends rather than assumptions.\n` +
        `7. Keep responses concise but insightful — aim for 2-4 paragraphs max.\n` +
        `8. Never fabricate data. If a tool returns no rows, describe that in friendly language (e.g. "You have not added investments in the app yet") — never mention JSON, arrays, API fields, or internal labels.\n` +
        `9. Never claim you created budgets unless **create_budgets** returned createdCount > 0. If duplicates were skipped, mention that.\n` +
        `10. If the user asks to create/add something, use the appropriate tool or guide them to the right page.\n` +
        `11. For debt strategy questions, compare avalanche vs snowball methods using their actual loan data.`,
    };

    const messages: NvidiaMessage[] = [
      systemMessage,
      ...(history || []).map((h: any) => ({
        role: (h.role === "ai" ? "assistant" : "user") as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    let loopMessages = [...messages];
    let finalText = "";
    let financeMutations = false;
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const response = await nvidiaChat(loopMessages, { tools, temperature: 0.3, maxTokens: 3000 });

      if (!response.toolCalls || response.toolCalls.length === 0) {
        finalText = response.text;
        break;
      }

      loopMessages.push({
        role: "assistant",
        content: response.text || "",
        ...(response.toolCalls ? { tool_calls: response.toolCalls } : {}),
      } as any);

      for (const toolCall of response.toolCalls) {
        const fnName = toolCall.function?.name;
        let toolResult: any = null;

        try {
          const args = JSON.parse(toolCall.function?.arguments || "{}");
          if (fnName === "get_transactions") {
            // Fix: slice to MAX_CONTEXT_TX so large transaction histories don't
            // blow the NVIDIA NIM token budget during the tool-call loop.
            const raw = await callBackend("/transactions", "GET", null, uid, token);
            toolResult = Array.isArray(raw) ? raw.slice(-MAX_CONTEXT_TX) : [];
          } else if (fnName === "get_accounts") {
            toolResult = await callBackend("/accounts", "GET", null, uid, token);
          } else if (fnName === "get_budgets") {
            toolResult = await callBackend("/budgets", "GET", null, uid, token);
          } else if (fnName === "get_savings_goals") {
            toolResult = await callBackend("/savings-goals", "GET", null, uid, token);
          } else if (fnName === "get_loans") {
            toolResult = await callBackend("/loans", "GET", null, uid, token);
          } else if (fnName === "get_recurring_payments") {
            toolResult = await callBackend("/recurring-payments", "GET", null, uid, token);
          } else if (fnName === "create_transaction") {
            const amount = Number(args?.amount);
            if (!Number.isFinite(amount)) {
              toolResult = { error: "amount must be a number" };
            } else if (Math.abs(amount) > MAX_AI_TX_AMOUNT) {
              toolResult = {
                error: `amount exceeds ${MAX_AI_TX_AMOUNT} cap — user must create this transaction manually`,
              };
            } else {
              toolResult = {
                pendingAction: {
                  type: "create_transaction",
                  payload: args,
                },
                requiresConfirmation: true,
                message:
                  "Transaction drafted. The user must confirm and submit via the Smart Add dialog before it is recorded.",
              };
            }
          } else if (fnName === "create_budgets") {
            const rawList = Array.isArray(args?.budgets) ? args.budgets : [];
            const created: unknown[] = [];
            const skippedDuplicates: string[] = [];
            const errs: string[] = [];
            let existing: unknown[] = [];
            try {
              existing = await callBackend("/budgets", "GET", null, uid, token);
            } catch {
              existing = [];
            }
            const taken = new Set(
              Array.isArray(existing)
                ? existing.map((b: unknown) =>
                    String((b as Record<string, unknown>).category ?? "")
                      .trim()
                      .toLowerCase()
                  )
                : []
            );
            const palette = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
            let colorIdx = 0;

            for (const row of rawList.slice(0, MAX_AI_BUDGET_BATCH)) {
              const category = String((row as Record<string, unknown>)?.category ?? "").trim();
              const limit = Number((row as Record<string, unknown>)?.limit);
              const curRaw = String((row as Record<string, unknown>)?.currency ?? "")
                .trim()
                .toUpperCase()
                .replace(/[^A-Z]/g, "")
                .slice(0, 3);
              const currency = curRaw.length === 3 ? curRaw : "EUR";

              if (!category || !Number.isFinite(limit) || limit <= 0) {
                errs.push("skipped invalid budget row");
                continue;
              }
              if (limit > MAX_AI_BUDGET_LIMIT) {
                errs.push(`${category}: exceeds limit cap`);
                continue;
              }
              const ck = category.toLowerCase();
              if (taken.has(ck)) {
                skippedDuplicates.push(category);
                continue;
              }

              try {
                const body = {
                  category,
                  limit,
                  currency,
                  emoji: "📊",
                  color: palette[colorIdx++ % palette.length],
                  periodType: "MONTHLY",
                };
                const saved = await callBackend("/budgets", "POST", body, uid, token);
                created.push(saved);
                taken.add(ck);
                financeMutations = true;
              } catch (e: unknown) {
                errs.push(
                  `${category}: ${e instanceof Error ? e.message : String(e)}`
                );
              }
            }
            toolResult = {
              createdCount: created.length,
              skippedDuplicates,
              errors: errs,
              budgets: created,
            };
          } else {
            toolResult = { error: `Unknown tool: ${fnName}` };
          }
        } catch (e: unknown) {
          toolResult = {
            error: IS_PROD_AI ? "Backend request failed" : e instanceof Error ? e.message : String(e),
          };
        }

        loopMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        } as any);
      }
    }

    if (!finalText) finalText = "I was unable to complete the request. Please try again.";
    res.json({ content: finalText, financeMutations });
  } catch (error: any) {
    console.error("AI Oracle Error:", error.message);
    res.status(500).json({ error: aiPublicError(error) });
  }
});

// ---------------------------------------------------------------------------
// 5. AI Insights
// ---------------------------------------------------------------------------

router.post("/insights", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { uid } = (req as any).user;
    const token =
      req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
      (req as any).cookies?.auth_token ||
      "";
    const { selectedBank } = req.body;
    if (!uid || !token) return res.status(401).json({ error: "Unauthorized" });
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    let fromBackend: unknown;
    try {
      fromBackend = await callBackend("/transactions", "GET", null, uid, token);
    } catch (e) {
      console.error("[insights] transactions fetch failed", e);
      return res.status(502).json({ error: "Could not load transactions for insights" });
    }

    let txs = Array.isArray(fromBackend) ? (fromBackend as Record<string, unknown>[]) : [];
    if (typeof selectedBank === "string" && selectedBank !== "" && selectedBank !== "ALL") {
      txs = txs.filter((t) => t.account === selectedBank);
    }

    const transactions = txs.slice(-50).map((t) => ({
      id: t.id,
      merchant: t.merchant,
      amount: t.amount,
      category: t.category,
      type: t.type,
      date: t.transactionDate ?? t.date,
      account: t.account,
      currency: t.currency,
    }));

    const bankFilter =
      selectedBank !== "ALL" ? `Focus on transactions from account: ${selectedBank}.` : "";

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
          content: `Analyze these transactions and give me 4 insights: ${JSON.stringify(transactions)}`,
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
    res.status(500).json({ error: aiPublicError(error) });
  }
});

// ---------------------------------------------------------------------------
// 6. Generic AI Chat
// ---------------------------------------------------------------------------

router.post("/chat", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const rawTransactions = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
    const rawAccounts = Array.isArray(req.body?.accounts) ? req.body.accounts : [];
    const history = rawHistory.slice(-MAX_HISTORY);
    const transactions = rawTransactions.slice(-MAX_CONTEXT_TX);
    const accountsSlim = slimBankAccountsForPrompt(rawAccounts);
    const financeSnapshot = buildFinanceSnapshotFromBody(
      (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>
    );
    const { message } = req.body;
    const { name } = (req as any).user;
    // Input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: "Message too long (max 4000 characters)" });
    }
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    const messages: NvidiaMessage[] = [
      {
        role: "system",
        content: buildChatSystemContent(name, transactions, accountsSlim, financeSnapshot),
      },
      ...history.map((h: any) => ({
        role: (h.role === "ai" ? "assistant" : "user") as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const { text } = await nvidiaChat(messages, { temperature: 0.5, maxTokens: 2500 });
    res.json({ content: text });
  } catch (error: any) {
    console.error("AI Chat Error:", error.message);
    res.status(500).json({ error: aiPublicError(error) });
  }
});

router.post("/chat-stream", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const rawTransactions = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
    const rawAccounts = Array.isArray(req.body?.accounts) ? req.body.accounts : [];
    const history = rawHistory.slice(-MAX_HISTORY);
    const transactions = rawTransactions.slice(-MAX_CONTEXT_TX);
    const accountsSlim = slimBankAccountsForPrompt(rawAccounts);
    const financeSnapshot = buildFinanceSnapshotFromBody(
      (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>
    );
    const { message } = req.body;
    const { name } = (req as any).user;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: "Message too long (max 4000 characters)" });
    }
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    const messages: NvidiaMessage[] = [
      {
        role: "system",
        content: buildChatSystemContent(name, transactions, accountsSlim, financeSnapshot),
      },
      ...history.map((h: any) => ({
        role: (h.role === "ai" ? "assistant" : "user") as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const upstream = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages,
        temperature: 0.5,
        max_tokens: 2500,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      if (!IS_PROD_AI) {
        console.error("[chat-stream] upstream error", upstream.status, errText.slice(0, 800));
      }
      return res.status(502).json({
        error: IS_PROD_AI ? "AI service unavailable. Try again later." : errText || "Upstream AI error",
      });
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock?.();
    }
    res.end();
  } catch (error: any) {
    console.error("AI Chat Stream Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: aiPublicError(error) });
    } else {
      res.end();
    }
  }
});

// ---------------------------------------------------------------------------
// 7. Forecast
// ---------------------------------------------------------------------------

router.post("/forecast", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { currentNetWorth, monthlySavings, riskProfile } = req.body;
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    const nw = Number(currentNetWorth);
    const ms = Number(monthlySavings);
    const riskStr =
      typeof riskProfile === "string" ? riskProfile.slice(0, 120) : String(riskProfile ?? "moderate").slice(0, 120);
    if (!Number.isFinite(nw) || nw < -1e14 || nw > 1e16) {
      return res.status(400).json({ error: "Invalid currentNetWorth" });
    }
    if (!Number.isFinite(ms) || ms < -1e9 || ms > 1e9) {
      return res.status(400).json({ error: "Invalid monthlySavings" });
    }

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
          content: `Current net worth: ${nw}. Monthly savings: ${ms}. Risk profile: ${riskStr}.`,
        },
      ],
      { jsonMode: true, temperature: 0.2 }
    );

    const parsed = safeJson(text);
    if (!parsed) return res.status(500).json({ error: "AI returned invalid JSON" });
    res.json(parsed);
  } catch (error: any) {
    console.error("AI Forecast Error:", error.message);
    res.status(500).json({ error: aiPublicError(error) });
  }
});

// ---------------------------------------------------------------------------
// 8. Tax Suggestions
// ---------------------------------------------------------------------------

function parsePotentialSavings(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === 'string') {
    const digits = value.replace(/[^0-9.-]/g, '');
    const parsed = Number.parseFloat(digits);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  }

  return 0;
}

function normalizeDifficulty(value: unknown): 'easy' | 'medium' | 'hard' {
  if (typeof value !== 'string') return 'medium';
  const normalized = value.toLowerCase();
  if (normalized === 'easy' || normalized === 'medium' || normalized === 'hard') {
    return normalized;
  }
  return 'medium';
}

function buildFallbackTaxSteps(title: string, description: string, category?: string): string[] {
  const subject = category || title || 'this opportunity';
  return [
    `Review your records for ${subject.toLowerCase()} and separate any expenses or contributions that may qualify for a deduction or tax advantage.`,
    `Quantify the eligible amount and document the supporting receipts, statements, or employer paperwork before your next filing cycle.`,
    `Apply the deduction or contribution change in your tax workflow and confirm the impact with a qualified tax professional if the rule is unclear.`
  ];
}

const TAX_AI_DISCLAIMER =
  "Estimates only — not legal, tax, or investment advice. Confirm rules for your jurisdiction with a qualified professional.";

router.post("/tax-suggestions", authMiddleware, aiLimiter, async (req, res) => {
  try {
    const { spendingData } = req.body || {};
    const jRaw = typeof req.body?.jurisdiction === "string" ? req.body.jurisdiction.trim().slice(0, 64) : "";
    const jurisdiction = jRaw || "UNSPECIFIED";
    if (!NVIDIA_API_KEY) return res.status(503).json({ error: "AI service not configured" });

    const { text } = await nvidiaChat(
      [
        {
          role: "system",
          content:
            `You are a tax optimization advisor. Analyze spending and income summaries and return generic educational suggestions only. ` +
            `Never guarantee refunds, filing outcomes, or jurisdiction-specific legal positions unless the payload explicitly names that jurisdiction. ` +
            `Avoid phrases like "you must file" or "you qualify for". ` +
            `Return ONLY a valid JSON array of suggestion objects with fields: ` +
            `title (string), description (string, max 200 chars), potentialSavings (number), category (string), difficulty ("easy"|"medium"|"hard"), steps (array of exactly 3 short actionable strings).`,
        },
        {
          role: "user",
          content: `Jurisdiction hint: ${jurisdiction}. Data: ${JSON.stringify(spendingData)}`,
        },
      ],
      { jsonMode: true, temperature: 0.3 }
    );

    const parsed = safeJson(text);
    if (!parsed) return res.status(500).json({ error: "AI returned invalid JSON" });
    const result = Array.isArray(parsed) ? parsed : parsed.suggestions || [];
    const normalized = result
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Tax optimization opportunity',
        description: typeof item.description === 'string' && item.description.trim() ? item.description.trim() : 'Review this item to reduce your potential tax burden.',
        potentialSavings: parsePotentialSavings(item.potentialSavings ?? item.estimatedSaving),
        difficulty: normalizeDifficulty(item.difficulty),
        steps: Array.isArray(item.steps) && item.steps.length > 0
          ? item.steps.filter((step: unknown) => typeof step === 'string' && step.trim()).slice(0, 3)
          : buildFallbackTaxSteps(item.title, item.description, item.category),
      }));

    res.json({
      jurisdiction,
      disclaimer: TAX_AI_DISCLAIMER,
      suggestions: normalized,
    });
  } catch (error: any) {
    console.error("AI Tax Suggestions Error:", error.message);
    res.status(500).json({ error: aiPublicError(error) });
  }
});

export { router as aiRouter };
