export type SmartGoal = { id: string; name: string };
export type SmartAccount = {
  id: string;
  name?: string;
  bank?: string;
  currency?: string;
  isPrimary?: boolean;
};
export type SmartBudget = { id: string; category: string; limit?: number; currency?: string };

export function normalizeCurrencyCode(c: unknown): string | undefined {
  if (typeof c !== "string") return undefined;
  const trimmed = c.trim();
  if (!trimmed) return undefined;
  if (/€|\beuro?s?\b/i.test(trimmed)) return "EUR";
  const u = trimmed.toUpperCase().replace(/[^A-Z]/g, "");
  return u.length >= 3 ? u.slice(0, 3) : undefined;
}

export function resolveAccountFromHint(
  accounts: SmartAccount[],
  hint: unknown,
  opts?: { currencyIso?: string }
): SmartAccount | undefined {
  const raw = String(hint ?? "").trim();
  if (!accounts.length) return undefined;

  if (!raw) {
    const C = opts?.currencyIso?.toUpperCase();
    if (C) {
      const primaryOfCcy = accounts.find((a) => a.isPrimary && (a.currency || "").toUpperCase() === C);
      if (primaryOfCcy) return primaryOfCcy;
      const anyOfCcy = accounts.find((a) => (a.currency || "").toUpperCase() === C);
      if (anyOfCcy) return anyOfCcy;
    }
    return accounts.find((a) => a.isPrimary) ?? accounts[0];
  }

  const n = raw.toLowerCase();
  const strip = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const byId = accounts.find((a) => a.id === raw);
  if (byId) return byId;

  let m = accounts.find((a) => (a.name || "").toLowerCase() === n);
  if (m) return m;

  m = accounts.find((a) => {
    const an = (a.name || "").toLowerCase();
    const bn = (a.bank || "").toLowerCase();
    return an.includes(n) || n.includes(an) || bn.includes(n) || n.includes(bn);
  });
  if (m) return m;

  const strippedNeedle = strip(raw);
  if (strippedNeedle.length >= 2) {
    m = accounts.find((a) => {
      const an = strip(a.name || "");
      const bn = strip(a.bank || "");
      return (
        an.includes(strippedNeedle) ||
        strippedNeedle.includes(an) ||
        bn.includes(strippedNeedle) ||
        strippedNeedle.includes(bn)
      );
    });
    if (m) return m;
  }

  if (/\brev\b/i.test(raw) || /revolut/i.test(raw)) {
    m = accounts.find(
      (a) =>
        /\brev\b/i.test(a.name || "") ||
        /revolut/i.test(a.name || "") ||
        /revolut/i.test(a.bank || "")
    );
    if (m) return m;
  }

  const C = opts?.currencyIso?.toUpperCase();
  if (C) {
    const primaryOfCcy = accounts.find((a) => a.isPrimary && (a.currency || "").toUpperCase() === C);
    if (primaryOfCcy) return primaryOfCcy;
    const anyOfCcy = accounts.find((a) => (a.currency || "").toUpperCase() === C);
    if (anyOfCcy) return anyOfCcy;
  }

  return undefined;
}

export function resolveSavingsGoalFromHint(
  goals: SmartGoal[],
  goalName?: unknown,
  goalId?: unknown
): SmartGoal | undefined {
  const id = typeof goalId === "string" ? goalId.trim() : "";
  if (id) {
    const byId = goals.find((g) => g.id === id);
    if (byId) return byId;
  }
  const name = String(goalName ?? "").trim().toLowerCase();
  if (!name) return undefined;
  return goals.find((g) => {
    const gn = g.name.toLowerCase();
    return gn === name || gn.includes(name) || name.includes(gn);
  });
}

function normalizeBudgetCategoryKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function resolveBudgetFromHint(
  budgets: SmartBudget[],
  categoryHint?: unknown,
  budgetIdHint?: unknown
): SmartBudget | undefined {
  const bid = typeof budgetIdHint === "string" ? budgetIdHint.trim() : "";
  if (bid) {
    const b = budgets.find((x) => x.id === bid);
    if (b) return b;
  }
  const cat = String(categoryHint ?? "").trim();
  if (!cat) return undefined;
  const k = normalizeBudgetCategoryKey(cat);
  let b = budgets.find((x) => normalizeBudgetCategoryKey(x.category) === k);
  if (b) return b;
  b = budgets.find((x) => {
    const ck = normalizeBudgetCategoryKey(x.category);
    return ck.includes(k) || k.includes(ck);
  });
  return b;
}

export function inferCurrencyHintFromUserText(raw: string): string | undefined {
  if (/\beuros?\b|€|\beur\b/i.test(raw)) return "EUR";
  if (/\bdollars?\b|\$\s*\d|\d\s*\$|\busd\b/i.test(raw)) return "USD";
  if (/\bpounds?\b|£|\bgbp\b/i.test(raw)) return "GBP";
  if (/₹|\brupees?\b|\binr\b/i.test(raw)) return "INR";
  return undefined;
}

export function looksLikeSavingsTopUp(raw: string): boolean {
  return (
    /\b(add|put|transfer|top\s*up|contribute|deposit|send)\b/i.test(raw) &&
    /\b(to|into|towards)\b/i.test(raw)
  );
}

export function looksLikeBudgetMutation(raw: string): boolean {
  if (/\b(create|open|add\s+a\s+new|new\s+\w+\s+budget)\b/i.test(raw)) return false;
  return (
    /\b(update|increase|decrease|change|raise|lower|adjust|set)\b/i.test(raw) &&
    /\b(budget|limit|cap)\b/i.test(raw)
  );
}

export function extractGoalTitleCandidates(raw: string): string[] {
  const out: string[] = [];
  const quoted = raw.matchAll(/["']([^"'\n]{2,120})["']/g);
  for (const m of quoted) out.push(m[1].trim());

  const parts = raw.split(/\b(?:to|into|towards)\b/i);
  if (parts.length > 1) {
    let tail = parts.slice(1).join(" ");
    tail = tail.split(/\b(?:and|also)\b|;|\n/i)[0] ?? tail;
    tail = tail.replace(/^\s*,?\s*/, "").trim();
    tail = tail.replace(/^(?:the|my|our)\s+/i, "").trim();
    tail = tail.replace(/\s+savings\s+(?:goal|fund)\b.*$/i, "").replace(/\bgoal\s*$/i, "").trim();
    tail = tail.split(/[.;]/)[0]?.trim() ?? tail;
    tail = tail.replace(/\s+/g, " ");
    if (tail.length >= 2) out.push(tail);
  }
  return [...new Set(out.filter(Boolean))];
}

function syntheticAccountsFromResults(items: Record<string, unknown>[]): SmartAccount[] {
  const syn: SmartAccount[] = [];
  for (const item of items) {
    if (String(item.intent ?? "").toUpperCase() !== "BANK_ACCOUNT") continue;
    const name = String(item.accountName ?? item.name ?? "").trim();
    if (!name) continue;
    const ccy = normalizeCurrencyCode(item.currency) || "EUR";
    syn.push({
      id: `__new__:${name.toLowerCase()}`,
      name,
      bank: typeof item.bank === "string" ? item.bank : "",
      currency: ccy,
      isPrimary: false,
    });
  }
  return syn;
}

export function sortBankAccountsFirst(items: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...items].sort((a, b) => {
    const ia = String(a.intent ?? "").toUpperCase() === "BANK_ACCOUNT" ? 0 : 1;
    const ib = String(b.intent ?? "").toUpperCase() === "BANK_ACCOUNT" ? 0 : 1;
    return ia - ib;
  });
}

export function normalizeProcessInputItems(
  input: string,
  items: Record<string, unknown>[],
  ctx: { savingsGoals: SmartGoal[]; accounts: SmartAccount[]; budgets: SmartBudget[] }
): Record<string, unknown>[] {
  const raw = input.trim();
  const textCcy = inferCurrencyHintFromUserText(raw);
  const topUpIntent = looksLikeSavingsTopUp(raw);
  const budgetMutate = looksLikeBudgetMutation(raw);

  const synthetic = syntheticAccountsFromResults(items);
  const extendedAccounts = [...ctx.accounts, ...synthetic];

  return items.map((item) => {
    const intent = String(item.intent ?? "TRANSACTION").toUpperCase();
    const next: Record<string, unknown> = { ...item };

    if (intent === "TRANSACTION") {
      let cur = normalizeCurrencyCode(next.currency);
      if (!cur && textCcy) next.currency = textCcy;
      cur = normalizeCurrencyCode(next.currency);
      const resolved = resolveAccountFromHint(extendedAccounts, next.account, {
        currencyIso: cur || textCcy,
      });
      if (resolved?.name) next.account = resolved.name;
      if (!normalizeCurrencyCode(next.currency) && resolved?.currency) next.currency = resolved.currency;
      if (!normalizeCurrencyCode(next.currency) && textCcy) next.currency = textCcy;
      if (!next.type) next.type = "expense";
      return next;
    }

    if (intent === "BANK_ACCOUNT") {
      if (!normalizeCurrencyCode(next.currency) && textCcy) next.currency = textCcy;
      return next;
    }

    if (intent === "BUDGET") {
      if (budgetMutate) {
        const existing = resolveBudgetFromHint(ctx.budgets, next.category, next.budgetId);
        if (existing && !next.budgetId) next.budgetId = existing.id;
      }
      if (!normalizeCurrencyCode(next.currency) && textCcy) next.currency = textCcy;
      return next;
    }

    if (intent === "SAVINGS_GOAL" && topUpIntent) {
      const amt = Math.abs(Number(next.target ?? next.amount ?? 0));
      let goal = resolveSavingsGoalFromHint(ctx.savingsGoals, next.name);
      if (!goal) {
        for (const cand of extractGoalTitleCandidates(raw)) {
          goal = resolveSavingsGoalFromHint(ctx.savingsGoals, cand);
          if (goal) break;
        }
      }
      if (goal && amt > 0) {
        return {
          intent: "SAVINGS_TRANSFER",
          goalId: goal.id,
          goalName: goal.name,
          amount: amt,
          confidence: typeof next.confidence === "number" ? next.confidence : 0.95,
        };
      }
    }

    if (intent === "SAVINGS_TRANSFER") {
      let g = resolveSavingsGoalFromHint(ctx.savingsGoals, next.goalName, next.goalId);
      if (!g) {
        for (const cand of extractGoalTitleCandidates(raw)) {
          g = resolveSavingsGoalFromHint(ctx.savingsGoals, cand);
          if (g) break;
        }
      }
      if (g) {
        next.goalId = g.id;
        next.goalName = g.name;
      }
      return next;
    }

    if (intent === "SAVINGS_GOAL" || intent === "RECURRING_PAYMENT" || intent === "LOAN") {
      if (!normalizeCurrencyCode(next.currency) && textCcy) next.currency = textCcy;
    }

    return next;
  });
}
