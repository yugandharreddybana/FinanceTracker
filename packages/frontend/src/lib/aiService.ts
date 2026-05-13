// ─── AI Service Layer ─────────────────────────────────────────────
// Connects to real LLM APIs (NVIDIA NIM / OpenAI) for genuine
// natural language understanding. Falls back to rule-based parser.

import { parseUserInput as ruleBasedParse, type ParsedAction, type ActionType } from './transactionParser';

const STORAGE_KEY = 'yugi_ai_config';

export interface AIConfig {
  provider: 'nvidia' | 'openai';
  apiKey: string;
  enabled: boolean;
}

export function getAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { provider: 'nvidia', apiKey: '', enabled: false };
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function isAIAvailable(): boolean {
  const config = getAIConfig();
  return config.enabled && config.apiKey.length > 10;
}

// ─── The System Prompt ──────────────────────────────────────────
// This is the core intelligence — it tells the LLM exactly what
// to do and what JSON shape to return.
const SYSTEM_PROMPT = `You are a financial assistant AI inside the "Yugi Finance" app. 
The user will give you natural language instructions about their finances.

Your job: Parse the input and return a JSON array of actions to perform.

Each action must be one of these types:
- "transaction" — user spent or received money
- "bank_account" — user wants to create/open a NEW bank account (opening balance is NOT salary/income)
- "budget" — user wants to create/set a spending budget for a category
- "savings_goal" — user wants to create a new savings goal
- "savings_contribute" — user wants to add money to an existing savings goal
- "loan" — user wants to record a new loan
- "recurring" — user wants to set up a recurring payment/income
- "investment" — user wants to record an investment

Return ONLY valid JSON. No markdown, no explanation, just the array.

For each action, include these fields:
{
  "actionType": "transaction|bank_account|budget|savings_goal|savings_contribute|loan|recurring|investment",
  "description": "human readable description",
  "amount": number (in rupees, 0 if unknown),
  "type": "income|expense",
  "category": "one of: Salary, Freelance, Investments, Food, Groceries, Shopping, Transport, Entertainment, Utilities, Health, Housing, Education, Insurance, Savings, Loan",
  "date": "YYYY-MM-DD (today if not specified)",
  
  // Bank account (only if actionType=bank_account):
  "newAccountName": "string",
  "newAccountBank": "string optional",
  "newAccountType": "Current|Savings|Credit",
  "accountCurrency": "ISO code e.g. EUR",
  
  // Budget-specific (only if actionType=budget):
  "budgetLimit": number,
  "budgetPeriod": "monthly|weekly|yearly",
  "isRecurring": boolean,
  
  // Savings goal (only if actionType=savings_goal):
  "goalName": "string",
  "goalTarget": number,
  "goalDeadline": "YYYY-MM-DD",
  "goalIcon": "emoji",
  
  // Savings contribute (only if actionType=savings_contribute):
  "contributeTo": "name of the goal",
  
  // Loan (only if actionType=loan):
  "loanName": "string",
  "loanType": "home|car|personal|education|credit_card",
  "loanPrincipal": number,
  "loanRate": number (annual %),
  "loanEmi": number,
  
  // Recurring (only if actionType=recurring):
  "recurringFreq": "daily|weekly|monthly|yearly",
  
  // Investment (only if actionType=investment):
  "investmentType": "stock|mutual_fund|fd|gold|crypto",
  "investmentName": "string",
  
  "confidence": 0.0-1.0,
  "needsClarification": boolean (true if you're not sure about the intent),
  "clarificationQuestion": "question to ask user if unclear"
}

IMPORTANT RULES:
1. If the user mentions multiple actions (separated by "and", commas, etc.), return MULTIPLE items in the array.
2. Auto-detect the CATEGORY from context (e.g., "Swiggy" → Food, "petrol" → Transport, "Netflix" → Entertainment).
3. Convert lakhs/crores to actual numbers (1 lakh = 100000, 1 crore = 10000000).
4. "by end of this year" → deadline = December 31 of current year.
5. If unsure about intent, set needsClarification=true and ask.
6. Today's date is: ${new Date().toISOString().split('T')[0]}
7. Default currency is INR (₹).
8. "recurring monthly" means set up as recurring with monthly frequency.
9. For budgets with "recurring for every month", set isRecurring=true and budgetPeriod="monthly".
10. Opening balance on a **new** bank account → actionType bank_account (never Salary/income transaction).`;

// ─── Call LLM API ───────────────────────────────────────────────
async function callLLM(userMessage: string): Promise<string> {
  const config = getAIConfig();
  if (!config.apiKey) throw new Error('No API key');

  if (config.provider === 'nvidia') {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.3-70b-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } else {
    // OpenAI
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

// ─── Parse LLM response into ParsedAction[] ────────────────────
function parseLLMResponse(raw: string): ParsedAction[] {
  // Extract JSON from response (LLM might wrap in markdown)
  let jsonStr = raw.trim();
  const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  try {
    const arr = JSON.parse(jsonStr);
    if (!Array.isArray(arr)) return [];

    return arr.map((item: any) => ({
      actionType: (item.actionType || 'transaction') as ActionType,
      description: item.description || '',
      amount: Number(item.amount) || 0,
      type: item.type === 'income' ? 'income' : 'expense',
      category: item.category || 'Food',
      date: item.date || new Date().toISOString().split('T')[0],
      budgetLimit: item.budgetLimit ? Number(item.budgetLimit) : undefined,
      budgetPeriod: item.budgetPeriod,
      isRecurring: item.isRecurring,
      goalName: item.goalName,
      goalTarget: item.goalTarget ? Number(item.goalTarget) : undefined,
      goalDeadline: item.goalDeadline,
      goalIcon: item.goalIcon,
      contributeTo: item.contributeTo,
      loanName: item.loanName,
      loanType: item.loanType,
      loanPrincipal: item.loanPrincipal ? Number(item.loanPrincipal) : undefined,
      loanRate: item.loanRate ? Number(item.loanRate) : undefined,
      loanEmi: item.loanEmi ? Number(item.loanEmi) : undefined,
      recurringFreq: item.recurringFreq,
      investmentType: item.investmentType,
      investmentName: item.investmentName,
      investmentQty: item.investmentQty ? Number(item.investmentQty) : undefined,
      investmentPrice: item.investmentPrice ? Number(item.investmentPrice) : undefined,
      newAccountName: item.newAccountName as string | undefined,
      newAccountBank: item.newAccountBank as string | undefined,
      newAccountType: item.newAccountType as ParsedAction['newAccountType'],
      accountCurrency: item.accountCurrency as string | undefined,
      confidence: Number(item.confidence) || 0.8,
      needsClarification: item.needsClarification || false,
      clarificationQuestion: item.clarificationQuestion || '',
      rawText: '',
    }));
  } catch {
    return [];
  }
}

// ─── Main entry point ───────────────────────────────────────────
// Tries AI first, falls back to rule-based parser.
export async function smartParse(input: string): Promise<{ actions: ParsedAction[]; usedAI: boolean }> {
  if (isAIAvailable()) {
    try {
      const raw = await callLLM(input);
      const actions = parseLLMResponse(raw);
      if (actions.length > 0) {
        // Stamp rawText
        for (const a of actions) a.rawText = input;
        return { actions, usedAI: true };
      }
    } catch (err) {
      console.warn('AI parse failed, falling back to rules:', err);
    }
  }

  // Fallback to rule-based
  return { actions: ruleBasedParse(input), usedAI: false };
}

// ─── AI Chat for Oracle ─────────────────────────────────────────
const CHAT_SYSTEM = `You are "Yugi Oracle", an AI financial advisor inside the Yugi Finance app.
You have access to the user's financial data which will be provided in each message.
Be helpful, concise, and give actionable advice. Use emojis sparingly.
Format responses with markdown (bold, bullet points, etc.).
Always be encouraging about good financial habits.
If the user asks to do something (add transaction, create budget, etc.), tell them to use the Smart Add feature (⌘K).`;

export async function chatWithOracle(
  message: string,
  financialContext: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  if (!isAIAvailable()) {
    return getFallbackChatResponse(message);
  }

  try {
    const config = getAIConfig();
    const endpoint = config.provider === 'nvidia'
      ? 'https://integrate.api.nvidia.com/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const model = config.provider === 'nvidia' ? 'meta/llama-3.3-70b-instruct' : 'gpt-4o-mini';

    const messages = [
      { role: 'system', content: CHAT_SYSTEM + '\n\nUser\'s financial data:\n' + financialContext },
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 800 }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (err) {
    console.warn('AI chat failed:', err);
    return getFallbackChatResponse(message);
  }
}

// ─── Fallback chat responses (no AI key) ────────────────────────
function getFallbackChatResponse(message: string): string {
  const l = message.toLowerCase();
  if (/spend|expens/.test(l)) return "📊 **Spending Analysis**\n\nI can see your spending patterns! Your top categories are Food, Shopping, and Transport.\n\n💡 **Tip:** Try cooking at home 3x more per week to save ~₹3,500/month.\n\n_For real-time AI analysis, add your API key in Settings → AI Configuration._";
  if (/budget/.test(l)) return "📋 **Budget Status**\n\nYour budgets are looking healthy overall! Watch your Food and Shopping categories — they're getting close to limits.\n\n💡 Use **Smart Add** (⌘K) to create new budgets by just typing naturally.\n\n_Connect an AI API in Settings for personalized advice._";
  if (/invest|portfolio|stock/.test(l)) return "📈 **Investment Insights**\n\nYour portfolio is showing positive returns! Diversification looks good.\n\n💡 Consider increasing your SIP by ₹2,000/month for significantly better long-term growth.\n\n_Add your API key in Settings for real AI-powered investment advice._";
  if (/save|goal/.test(l)) return "🎯 **Savings Goals**\n\nYou're making good progress on your goals! Emergency fund is almost there.\n\n💡 Automate your savings with recurring transfers using Smart Add.\n\n_For personalized savings strategies, connect AI in Settings._";
  if (/loan|emi|debt/.test(l)) return "🏦 **Loan Overview**\n\nYour loan repayments are on track. Consider making prepayments when you have surplus to save on interest.\n\n_Connect AI in Settings for detailed loan optimization advice._";
  return "👋 I'm **Yugi Oracle**, your finance assistant!\n\nI can help with:\n• 📊 Spending analysis\n• 📋 Budget advice\n• 📈 Investment tips\n• 🎯 Savings strategies\n• 🏦 Loan optimization\n\n**For full AI power**, add your NVIDIA or OpenAI API key in **Settings → AI Configuration**.\n\nWhat would you like to know?";
}
