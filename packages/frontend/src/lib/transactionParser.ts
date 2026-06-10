// ─── Intent-Aware Smart Parser v3 ─────────────────────────────────
// Uses scored intent detection across ALL action types.
// Returns a `clarify` flag when intent is ambiguous.

export type ActionType =
  | 'transaction'
  | 'bank_account'
  | 'budget'
  | 'savings_goal'
  | 'savings_contribute'
  | 'loan'
  | 'recurring'
  | 'investment';

export interface ParsedAction {
  actionType: ActionType;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  /** ISO currency for transaction rows when distinct from account preference */
  transactionCurrency?: string;
  budgetLimit?: number;
  budgetPeriod?: 'monthly' | 'weekly' | 'yearly';
  isRecurring?: boolean;
  goalName?: string;
  goalTarget?: number;
  goalDeadline?: string;
  goalIcon?: string;
  contributeTo?: string;
  loanName?: string;
  loanType?: 'home' | 'car' | 'personal' | 'education' | 'credit_card';
  loanPrincipal?: number;
  loanRate?: number;
  loanEmi?: number;
  loanTenure?: number;
  recurringFreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  investmentType?: 'stock' | 'mutual_fund' | 'fd' | 'gold' | 'crypto';
  investmentName?: string;
  investmentQty?: number;
  investmentPrice?: number;
  confidence: number;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  accountId?: string;
  newAccountName?: string;
  newAccountBank?: string;
  newAccountType?: 'Current' | 'Savings' | 'Credit';
  accountCurrency?: string;
  rawText: string;
}

// ─── Category keywords ──────────────────────────────────────────
const CAT_KW: Record<string, { kw: string[]; type: 'income' | 'expense' }> = {
  Salary:        { kw: ['salary', 'paycheck', 'wages', 'stipend'], type: 'income' },
  Freelance:     { kw: ['freelance', 'gig', 'consulting', 'client payment', 'side hustle'], type: 'income' },
  Investments:   { kw: ['dividend', 'interest earned', 'investment return', 'capital gain'], type: 'income' },
  Food:          { kw: ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'coffee', 'tea', 'lunch', 'dinner', 'breakfast', 'biryani', 'pizza', 'burger', 'dosa', 'chai', 'snacks', 'eat', 'meal', 'dominos', 'kfc', 'mcdonalds', 'starbucks', 'dining', 'takeout', 'delivery'], type: 'expense' },
  Groceries:     { kw: ['grocery', 'groceries', 'vegetables', 'fruits', 'bigbasket', 'dmart', 'zepto', 'blinkit', 'instamart', 'supermarket', 'provisions', 'ration', 'milk', 'eggs', 'bread'], type: 'expense' },
  Shopping:      { kw: ['amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'clothes', 'shoes', 'gadget', 'electronics', 'phone', 'laptop', 'headphones', 'watch', 'dress', 'shirt', 'bought'], type: 'expense' },
  Transport:     { kw: ['uber', 'ola', 'cab', 'taxi', 'petrol', 'diesel', 'fuel', 'auto', 'metro', 'bus', 'train', 'flight', 'travel', 'commute', 'parking', 'toll', 'rapido', 'transport', 'transportation', 'ride'], type: 'expense' },
  Entertainment: { kw: ['netflix', 'spotify', 'hotstar', 'prime', 'movie', 'cinema', 'theatre', 'gaming', 'subscription', 'ott', 'disney', 'youtube', 'concert', 'show'], type: 'expense' },
  Utilities:     { kw: ['electricity', 'water bill', 'gas bill', 'internet', 'wifi', 'broadband', 'phone bill', 'mobile recharge', 'recharge', 'jio', 'airtel', 'bill', 'postpaid', 'prepaid', 'utility'], type: 'expense' },
  Health:        { kw: ['gym', 'doctor', 'hospital', 'medicine', 'pharmacy', 'medical', 'health', 'fitness', 'cult', 'yoga', 'clinic', 'therapy', 'dental', 'checkup'], type: 'expense' },
  Housing:       { kw: ['rent', 'house rent', 'apartment', 'flat rent', 'maintenance', 'society', 'property tax', 'home rent'], type: 'expense' },
  Education:     { kw: ['course', 'udemy', 'coursera', 'books', 'tuition', 'school', 'college', 'fees', 'education', 'coaching', 'learning', 'classes'], type: 'expense' },
  Insurance:     { kw: ['insurance', 'lic', 'term plan', 'premium', 'policy', 'health insurance', 'life insurance'], type: 'expense' },
};

// ─── Scored intent signals ──────────────────────────────────────
// Each signal is [regex, weight]. We sum weights per intent.
// The intent with the highest score wins. If top two are close → clarify.
const INTENT_SIGNALS: Record<ActionType, [RegExp, number][]> = {
  budget: [
    [/\bbudget\b/i, 10],
    [/\ballocat/i, 7],
    [/\blimit\b.*\bspend/i, 8],
    [/\bcap\b.*\bexpens/i, 7],
    [/\bset\b.*\blimit/i, 8],
    [/\bmonthly\b.*\blimit/i, 6],
    [/\bspending\s*limit/i, 8],
  ],
  savings_goal: [
    [/\bsav(?:e|ing)\b.*\bfor\b/i, 10],
    [/\bgoal\b/i, 8],
    [/\btarget\b.*\bsav/i, 7],
    [/\bsave\b.*\bup\b/i, 6],
    [/\bplanning?\s*to\s*save/i, 7],
    [/\bwant\s*to\s*save/i, 7],
    [/\bneed\s*to\s*save/i, 6],
    [/\bsavings?\b.*\btarget/i, 7],
    [/\bdown\s*payment/i, 7],
  ],
  savings_contribute: [
    [/\badd\b.*\bto\b.*\b(?:goal|fund|saving)/i, 10],
    [/\bdeposit\b.*\b(?:into|to)\b/i, 8],
    [/\bcontribute\b.*\b(?:to|towards)\b/i, 9],
    [/\btop\s*up\b/i, 8],
    [/\bput\b.*\b(?:into|towards|in)\b.*\b(?:goal|fund|saving)/i, 9],
    [/\btransfer\b.*\b(?:to|into)\b.*\b(?:goal|fund|saving)/i, 8],
  ],
  loan: [
    [/\bloan\b/i, 10],
    [/\bemi\b/i, 8],
    [/\bmortgage\b/i, 9],
    [/\bborrow/i, 8],
    [/\bdebt\b/i, 5],
    [/\binterest\s*rate/i, 4],
    [/\btenure\b/i, 5],
    [/\bprincipal\b/i, 6],
  ],
  recurring: [
    [/\brecurring\b/i, 10],
    [/\bevery\s+(?:day|week|month|year)/i, 9],
    [/\brepeat(?:ing|s)?\b/i, 8],
    [/\bsubscription\b/i, 7],
    [/\bauto\s*(?:pay|debit)/i, 8],
    [/\bstanding\s*order/i, 7],
    [/\bmonthly\s+(?:payment|charge|expense|bill)/i, 6],
    [/\bweekly\s+(?:payment|expense)/i, 6],
  ],
  investment: [
    [/\binvest\b/i, 10],
    [/\bsip\b/i, 9],
    [/\bmutual\s*fund/i, 10],
    [/\bstock\b/i, 8],
    [/\bshare[s]?\b.*\bbuy/i, 8],
    [/\bbuy\b.*\bshare/i, 8],
    [/\bfd\b|\bfixed\s*deposit/i, 9],
    [/\bgold\b.*\b(?:buy|invest|purchase)/i, 7],
    [/\bcrypto/i, 8],
    [/\bportfolio\b/i, 5],
    [/\bnifty|sensex|bse|nse\b/i, 7],
  ],
  bank_account: [
    [/\bnew\s+bank\s+account\b/i, 15],
    [/\bcreate\b.*\bbank\s+account\b/i, 15],
    [/\bopen\b.*\bbank\s+account\b/i, 14],
    [/\badd\b.*\b(?:new\s+)?bank\s+account\b/i, 14],
    [/\bbank\s+account\b.*\b(?:named|called)\b/i, 13],
    [/\b(?:named|called)\b.*\bbank\s+account\b/i, 12],
    [/\bopening\s+balance\b|\binitial\s+balance\b/i, 11],
    [/\baccount\b.*\b(?:named|called)\b/i, 9],
  ],
  transaction: [
    [/\bspent\b/i, 8],
    [/\bpaid\b/i, 7],
    [/\bbought\b/i, 7],
    [/\bpurchased\b/i, 7],
    [/\bordered\b/i, 6],
    [/\bcharged\b/i, 6],
    [/\bdebited\b/i, 7],
    [/\breceived\b/i, 7],
    [/\bearned\b/i, 7],
    [/\bcredited\b/i, 7],
    [/\bgot\s*paid/i, 7],
    [/\bsalary\b/i, 6],
    [/\brefund\b/i, 6],
    [/\bcashback\b/i, 6],
  ],
};

// ─── Helpers ────────────────────────────────────────────────────
function extractAmounts(text: string): number[] {
  const amounts: number[] = [];
  const add = (n: number) => { if (n > 0 && n < 1e9 && !amounts.includes(n)) amounts.push(n); };
  // Lakhs/crores
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(?:lakhs?|lacs?)/gi)) add(parseFloat(m[1].replace(/,/g, '')) * 100000);
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(?:crores?|cr)\b/gi)) add(parseFloat(m[1].replace(/,/g, '')) * 10000000);
  // ₹/Rs/INR patterns
  for (const m of text.matchAll(/(?:₹|rs\.?\s*|inr\s*|rupees?\s*)(\d[\d,]*(?:\.\d{1,2})?)/gi)) add(parseFloat(m[1].replace(/,/g, '')));
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d{1,2})?)(?:\s*(?:₹|rs|rupees?|inr|\/-))/gi)) add(parseFloat(m[1].replace(/,/g, '')));
  // €/EUR patterns
  for (const m of text.matchAll(/(?:€|eur\s*|euros?\s*)(\d[\d,]*(?:\.\d{1,2})?)/gi)) add(parseFloat(m[1].replace(/,/g, '')));
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d{1,2})?)(?:\s*(?:€|eur|euros?))/gi)) add(parseFloat(m[1].replace(/,/g, '')));
  // "of/for/limit 10000"
  for (const m of text.matchAll(/(?:of|for|amount|total|limit|worth|at|to|price|cost)\s+(\d[\d,]*(?:\.\d{1,2})?)/gi)) add(parseFloat(m[1].replace(/,/g, '')));
  // Plain numbers as fallback
  if (amounts.length === 0) {
    for (const m of text.matchAll(/\b(\d{2,9}(?:\.\d{1,2})?)\b/g)) add(parseFloat(m[1]));
  }
  return amounts;
}

function extractDate(text: string): string {
  const l = text.toLowerCase(); const now = new Date();
  if (l.includes('yesterday')) { const d = new Date(now); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; }
  if (l.includes('last week'))  { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; }
  return now.toISOString().split('T')[0];
}

function extractDeadline(text: string): string {
  const l = text.toLowerCase(); const now = new Date();
  if (/(?:end\s+of\s+(?:this\s+)?year|year\s*end|by\s+(?:the\s+)?(?:end\s+of\s+)?(?:this\s+)?year|this\s+year\s*$)/i.test(l)) return `${now.getFullYear()}-12-31`;
  if (/next\s+year/i.test(l)) return `${now.getFullYear() + 1}-12-31`;
  const ym = l.match(/in\s+(\d+)\s+years?/); if (ym) { const d = new Date(now); d.setFullYear(d.getFullYear() + +ym[1]); return d.toISOString().split('T')[0]; }
  const mm = l.match(/in\s+(\d+)\s+months?/); if (mm) { const d = new Date(now); d.setMonth(d.getMonth() + +mm[1]); return d.toISOString().split('T')[0]; }
  const MO: Record<string,number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,october:9,november:10,december:11 };
  const bm = l.match(/by\s+(?:end\s+of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d{4})?/i);
  if (bm) { const m = MO[bm[1].toLowerCase()]; const y = bm[2] ? +bm[2] : (m >= now.getMonth() ? now.getFullYear() : now.getFullYear() + 1); return new Date(y, m + 1, 0).toISOString().split('T')[0]; }
  const by = l.match(/(?:by|before)\s+(\d{4})/); if (by) return `${by[1]}-12-31`;
  const d = new Date(now); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0];
}

function detectCategory(text: string): { category: string; type: 'income' | 'expense' } {
  const l = text.toLowerCase(); let best = ''; let bType: 'income'|'expense' = 'expense'; let bLen = 0;
  for (const [cat, { kw, type }] of Object.entries(CAT_KW)) for (const k of kw) if (l.includes(k) && k.length > bLen) { best = cat; bType = type; bLen = k.length; }
  if (['salary','earned','received','got paid','income','bonus','refund','cashback','dividend','credited'].some(k => l.includes(k))) bType = 'income';
  if (['spent','paid','bought','purchased','ordered','charged','debited'].some(k => l.includes(k))) bType = 'expense';
  if (!best) best = bType === 'income' ? 'Freelance' : 'Food';
  return { category: best, type: bType };
}

function extractGoalName(text: string): string {
  const patterns = [
    /(?:save|saving)\s+(?:up\s+)?(?:for|towards)\s+(?:a\s+)?(?:new\s+)?(.+?)(?:\s+(?:of|with|worth|₹|rs|inr|by|before|till|deadline|\d))/i,
    /(?:save|saving)\s+(?:up\s+)?(?:for|towards)\s+(?:a\s+)?(?:new\s+)?(.+)/i,
    /goal\s+(?:called|named|for|:)\s*(.+?)(?:\s+(?:of|with|₹|rs|\d))/i,
    /goal\s+(?:called|named|for|:)\s*(.+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      let n = m[1].replace(/\d[\d,]*/g,'').replace(/₹|rs\.?|inr/gi,'').replace(/\b(?:by|before|till|until|in|end|of|this|next|year|month|lakhs?|lacs?|crores?|rupees?)\b/gi,'').replace(/\s+/g,' ').trim();
      if (n.length > 1) return n.charAt(0).toUpperCase() + n.slice(1);
    }
  }
  return 'New Goal';
}

function detectGoalIcon(text: string): string {
  const l = text.toLowerCase();
  const map: [RegExp,string][] = [[/car|vehicle/,'🚗'],[/house|home|flat|apartment/,'🏠'],[/vacation|trip|travel|holiday|goa|beach/,'🏖️'],[/flight|abroad/,'✈️'],[/phone|iphone|mobile/,'📱'],[/laptop|macbook|computer/,'💻'],[/wedding|marriage|ring/,'💍'],[/education|college|degree/,'📚'],[/emergency|safety|rainy/,'🛡️'],[/bike|motorcycle/,'🏍️'],[/baby|child/,'👶'],[/business|startup/,'🚀'],[/retire/,'🏖️']];
  for (const [r, i] of map) if (r.test(l)) return i;
  return '🎯';
}

function extractFrequency(text: string): 'daily'|'weekly'|'monthly'|'yearly' {
  const l = text.toLowerCase();
  if (/daily|every\s*day/i.test(l)) return 'daily';
  if (/weekly|every\s*week/i.test(l)) return 'weekly';
  if (/yearly|annually|every\s*year/i.test(l)) return 'yearly';
  return 'monthly';
}

function extractBudgetPeriod(text: string): { period: 'monthly'|'weekly'|'yearly'; isRecurring: boolean } {
  const l = text.toLowerCase();
  const isRec = /recurring|every\s+(?:day|week|month|year)|repeat|auto/i.test(l);
  if (/every\s*week|weekly|per\s*week/i.test(l)) return { period: 'weekly', isRecurring: true };
  if (/every\s*month|monthly|per\s*month|each\s*month/i.test(l)) return { period: 'monthly', isRecurring: true };
  if (/every\s*year|yearly|annually|per\s*year/i.test(l)) return { period: 'yearly', isRecurring: true };
  if (/this\s*month/i.test(l)) return { period: 'monthly', isRecurring: isRec };
  return { period: 'monthly', isRecurring: isRec };
}

function extractCurrencyIso(text: string): string | undefined {
  if (/\beuros?\b|€|\beur\b/i.test(text)) return 'EUR';
  if (/\bdollars?\b|\$|\busd\b/i.test(text)) return 'USD';
  if (/£|\bgbp\b/i.test(text)) return 'GBP';
  if (/₹|\binr\b|\brupees?\b/i.test(text)) return 'INR';
  return undefined;
}

function extractNewBankAccountName(text: string): string {
  const quoted = /['"]([^'"]+)['"]/.exec(text);
  if (quoted?.[1]) return quoted[1].trim();
  const patterns = [
    /(?:named|called)\s+([^,\n]+?)(?:\s+(?:in|with|,|\(|balance|currency|eur|usd|inr)|$)/i,
    /(?:bank\s+)?account\s+(?:named|called)\s+([^,\n]+?)(?:\s+(?:in|with|,|balance)|$)/i,
    /new\s+bank\s+account\s+(?:named|called)?\s*([^,\n]+?)(?:\s+(?:in|with|,|balance)|$)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      let n = m[1].replace(/\d[\d,]*/g, '').replace(/^(?:a|an|the|my)\s+/i, '').replace(/\s+/g, ' ').trim();
      if (n.length > 0) return n.charAt(0).toUpperCase() + n.slice(1);
    }
  }
  return '';
}

// ─── Scored Intent Detection ────────────────────────────────────
function scoreIntents(text: string): { intent: ActionType; score: number; secondIntent: ActionType; secondScore: number } {
  const l = text.toLowerCase();
  const scores: Record<ActionType, number> = {
    transaction: 0,
    bank_account: 0,
    budget: 0,
    savings_goal: 0,
    savings_contribute: 0,
    loan: 0,
    recurring: 0,
    investment: 0,
  };
  for (const [intent, signals] of Object.entries(INTENT_SIGNALS) as [ActionType, [RegExp,number][]][]) {
    for (const [re, w] of signals) if (re.test(l)) scores[intent] += w;
  }
  // If nothing scored, default to transaction with low score
  if (Object.values(scores).every(s => s === 0)) scores.transaction = 3;

  const sorted = (Object.entries(scores) as [ActionType, number][]).sort((a, b) => b[1] - a[1]);
  return { intent: sorted[0][0], score: sorted[0][1], secondIntent: sorted[1][0], secondScore: sorted[1][1] };
}

// ─── Sentence splitter ──────────────────────────────────────────
function splitSentences(text: string): string[] {
  // Split on newlines, semicolons, and periods followed by space+capital
  let chunks = text.split(/[;\n]+|(?<=\.)\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 0);
  // Try comma-split if parts have different intents
  const expanded: string[] = [];
  for (const chunk of chunks) {
    const parts = chunk.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (parts.length <= 1) { expanded.push(chunk); continue; }
    const intents = parts.map(p => scoreIntents(p).intent);
    if (new Set(intents).size > 1) {
      // Different intents — split them, but merge continuation clauses
      let buf = '';
      for (let i = 0; i < parts.length; i++) {
        const hasAmt = extractAmounts(parts[i]).length > 0;
        const hasVerb = /\b(?:create|set|add|save|spent|paid|bought|invest|budget|loan|goal|recurring|deposit|open|named|called|account)\b/i.test(parts[i]);
        if ((hasAmt || hasVerb) && buf) { expanded.push(buf.trim()); buf = parts[i]; }
        else { buf = buf ? `${buf}, ${parts[i]}` : parts[i]; }
      }
      if (buf) expanded.push(buf.trim());
    } else {
      // Same intent — for transactions, split if multiple amounts
      if (intents[0] === 'transaction') {
        const withAmts = parts.filter(p => extractAmounts(p).length > 0);
        if (withAmts.length > 1) { expanded.push(...withAmts); continue; }
      }
      expanded.push(chunk);
    }
  }
  // Split on "and"/"also" ONLY for transaction intent segments with multiple amounts
  const final: string[] = [];
  for (const seg of expanded) {
    const { intent } = scoreIntents(seg);
    if (intent === 'transaction' && extractAmounts(seg).length > 1) {
      const andParts = seg.split(/\b(?:and|also|then|plus)\b/i).map(s => s.trim()).filter(s => s.length > 0 && extractAmounts(s).length > 0);
      if (andParts.length > 1) { final.push(...andParts); continue; }
    }
    final.push(seg);
  }
  return final.length > 0 ? final : [text.trim()];
}

// ─── Main Parse ─────────────────────────────────────────────────
export function parseUserInput(input: string): ParsedAction[] {
  const segments = splitSentences(input);
  const results: ParsedAction[] = [];

  for (const seg of segments) {
    const { intent, score, secondIntent, secondScore } = scoreIntents(seg);
    const amounts = extractAmounts(seg);
    const date = extractDate(seg);
    const isAmbiguous = score > 0 && secondScore > 0 && (score - secondScore) <= 3;
    const noAmount = amounts.length === 0;

    // Build clarification question for ambiguous cases
    let clarQ = '';
    if (isAmbiguous) {
      const l1 = intentLabel(intent), l2 = intentLabel(secondIntent);
      clarQ = `Did you mean to create a ${l1} or a ${l2}?`;
    }

    switch (intent) {
      case 'budget': {
        const { category } = detectCategory(seg);
        const amt = amounts[0] || 0;
        const { period, isRecurring } = extractBudgetPeriod(seg);
        results.push({
          actionType: 'budget', description: `${category} Budget`, amount: amt, type: 'expense', category, date,
          budgetLimit: amt, budgetPeriod: period, isRecurring,
          confidence: noAmount ? 0.5 : 0.95,
          needsClarification: isAmbiguous || noAmount,
          clarificationQuestion: noAmount ? 'What should the budget limit be?' : clarQ,
          rawText: seg,
        });
        break;
      }
      case 'savings_goal': {
        const goalName = extractGoalName(seg);
        const icon = detectGoalIcon(seg);
        const deadline = extractDeadline(seg);
        results.push({
          actionType: 'savings_goal', description: goalName, amount: 0, type: 'expense', category: 'Savings', date,
          goalName, goalTarget: amounts[0] || 0, goalDeadline: deadline, goalIcon: icon,
          confidence: amounts.length > 0 ? 0.95 : 0.5,
          needsClarification: isAmbiguous || noAmount,
          clarificationQuestion: noAmount ? `How much do you want to save for "${goalName}"?` : clarQ,
          rawText: seg,
        });
        break;
      }
      case 'savings_contribute': {
        const nm = seg.match(/(?:to|into|towards|in)\s+(?:my\s+)?(.+?)(?:\s+goal|\s+fund|\s+savings?|$)/i);
        let gn = nm?.[1]?.replace(/\d[\d,]*/g,'').replace(/₹|rs\.?/gi,'').trim() || 'Savings';
        gn = gn.charAt(0).toUpperCase() + gn.slice(1);
        results.push({
          actionType: 'savings_contribute', description: `Add to ${gn}`, amount: amounts[0] || 0, type: 'expense', category: 'Savings', date,
          contributeTo: gn,
          confidence: amounts.length > 0 ? 0.9 : 0.4,
          needsClarification: isAmbiguous || noAmount,
          clarificationQuestion: noAmount ? `How much to add to "${gn}"?` : clarQ,
          rawText: seg,
        });
        break;
      }
      case 'loan': {
        const l = seg.toLowerCase();
        const lt = (/home|house|property|mortgage/.test(l)?'home':/car|vehicle/.test(l)?'car':/education|student/.test(l)?'education':/credit\s*card/.test(l)?'credit_card':'personal') as 'home'|'car'|'personal'|'education'|'credit_card';
        const rate = (seg.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] ?? '');
        const emiM = l.match(/emi\s+(?:of\s+)?(?:₹|rs\.?\s*)?(\d[\d,]*)/i);
        const tn = lt.replace('_',' '); const tnC = tn.charAt(0).toUpperCase()+tn.slice(1);
        results.push({
          actionType: 'loan', description: `${tnC} Loan`, amount: amounts[0]||0, type: 'expense', category: 'Loan', date,
          loanName: `${tnC} Loan`, loanType: lt, loanPrincipal: amounts[0]||0,
          loanRate: rate ? parseFloat(rate) : 8.5,
          loanEmi: emiM ? parseFloat(emiM[1].replace(/,/g,'')) : 0,
          confidence: amounts.length > 0 ? 0.9 : 0.4,
          needsClarification: isAmbiguous || noAmount,
          clarificationQuestion: noAmount ? 'What is the loan amount?' : clarQ,
          rawText: seg,
        });
        break;
      }
      case 'recurring': {
        const { category, type } = detectCategory(seg);
        const freq = extractFrequency(seg);
        const amt = amounts[0] || 0;
        let desc = seg.replace(/₹|rs\.?\s*/gi,'').replace(/\d[\d,]*/g,'').replace(/\b(?:create|add|set|new|recurring|every|month|week|year|daily|weekly|monthly|yearly|an?|the|for|of|my|is|it|and|till|this|that)\b/gi,'').replace(/\s+/g,' ').trim();
        desc = desc ? desc.charAt(0).toUpperCase()+desc.slice(1) : `Recurring ${category}`;
        const nextDate = new Date(); nextDate.setMonth(nextDate.getMonth() + (freq === 'monthly' ? 1 : 0));
        results.push({
          actionType: 'recurring', description: desc, amount: amt, type, category, date,
          recurringFreq: freq, isRecurring: true,
          confidence: amt > 0 ? 0.9 : 0.4,
          needsClarification: isAmbiguous || noAmount,
          clarificationQuestion: noAmount ? `What is the recurring amount for "${desc}"?` : clarQ,
          rawText: seg,
        });
        break;
      }
      case 'bank_account': {
        const accName = extractNewBankAccountName(seg);
        const ccy = extractCurrencyIso(seg);
        const amt = amounts[0] ?? 0;
        const lt = seg.toLowerCase();
        const accTyp: 'Current' | 'Savings' | 'Credit' = /\bcredit\b|\bcard\b/i.test(seg)
          ? 'Credit'
          : /\bsavings\b/i.test(lt)
            ? 'Savings'
            : 'Current';
        results.push({
          actionType: 'bank_account',
          description: accName || 'New account',
          newAccountName: accName,
          newAccountBank: '',
          newAccountType: accTyp,
          amount: amt,
          accountCurrency: ccy,
          type: 'expense',
          category: 'Others',
          date,
          confidence: accName ? 0.92 : 0.45,
          needsClarification: isAmbiguous || !accName,
          clarificationQuestion: !accName ? 'What should the new bank account be named?' : clarQ,
          rawText: seg,
        });
        break;
      }
      case 'investment': {
        const l = seg.toLowerCase();
        const iType = (/mutual\s*fund|sip/.test(l)?'mutual_fund':/stock|share|nifty|sensex/.test(l)?'stock':/fd|fixed\s*deposit/.test(l)?'fd':/gold/.test(l)?'gold':/crypto|bitcoin/.test(l)?'crypto':'mutual_fund') as 'stock'|'mutual_fund'|'fd'|'gold'|'crypto';
        let iName = seg.replace(/₹|rs\.?\s*/gi,'').replace(/\d[\d,]*/g,'').replace(/\b(?:invest|buy|purchase|create|add|new|in|into|an?|the|of|for|my|worth|at|price|₹)\b/gi,'').replace(/\s+/g,' ').trim();
        iName = iName ? iName.charAt(0).toUpperCase()+iName.slice(1) : `${iType.replace('_',' ')} Investment`;
        results.push({
          actionType: 'investment', description: iName, amount: amounts[0]||0, type: 'expense', category: 'Investments', date,
          investmentType: iType, investmentName: iName, investmentPrice: amounts[0]||0, investmentQty: 1,
          confidence: amounts.length > 0 ? 0.85 : 0.4,
          needsClarification: isAmbiguous || noAmount,
          clarificationQuestion: noAmount ? `How much to invest in "${iName}"?` : clarQ,
          rawText: seg,
        });
        break;
      }
      default: {
        const { category, type } = detectCategory(seg);
        if (amounts.length === 0) {
          results.push({
            actionType: 'transaction', description: seg.charAt(0).toUpperCase()+seg.slice(1),
            amount: 0, type, category, date, confidence: 0.3,
            needsClarification: true, clarificationQuestion: 'What was the amount?',
            rawText: seg,
          });
        } else {
          for (const amt of amounts) {
            let d2 = seg.replace(/₹|rs\.?\s*/gi,'').replace(/\d[\d,]*/g,'').replace(/\s+/g,' ').trim();
            d2 = d2 ? d2.charAt(0).toUpperCase()+d2.slice(1) : `${type==='income'?'Income':'Expense'} — ${category}`;
            results.push({
              actionType: 'transaction', description: d2, amount: amt, type, category, date,
              confidence: 0.8, rawText: seg,
            });
          }
        }
      }
    }
  }

  return results.length > 0 ? results : [{
    actionType: 'transaction', description: input||'New entry', amount: 0, type: 'expense', category: 'Food',
    date: new Date().toISOString().split('T')[0], confidence: 0.1,
    needsClarification: true, clarificationQuestion: 'What would you like to do?', rawText: input,
  }];
}

function intentLabel(t: ActionType): string {
  return {
    transaction: 'Transaction',
    bank_account: 'Bank Account',
    budget: 'Budget',
    savings_goal: 'Savings Goal',
    savings_contribute: 'Goal Contribution',
    loan: 'Loan',
    recurring: 'Recurring Payment',
    investment: 'Investment',
  }[t];
}

// Receipt parser
export function parseReceiptText(text: string): ParsedAction[] {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const results: ParsedAction[] = [];
  const today = new Date().toISOString().split('T')[0];
  for (const line of lines) {
    const amounts = extractAmounts(line);
    if (amounts.length > 0) {
      const { category, type } = detectCategory(line);
      let desc = line.replace(/[₹€]|rs\.?\s*|eur\s*/gi,'').replace(/\d[\d,]*/g,'').replace(/[:\-|]/g,' ').replace(/\s+/g,' ').trim();
      desc = desc ? desc.charAt(0).toUpperCase()+desc.slice(1) : `Item — ${category}`;
      results.push({ actionType: 'transaction', description: desc, amount: amounts[0], type, category, date: today, confidence: 0.75, rawText: line });
    }
  }
  return results;
}
