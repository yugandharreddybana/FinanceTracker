import { Transaction, BankAccount, Budget, Loan, SavingsGoal, RecurringPayment, IncomeSource, Investment, FamilyAccount, AuditLog } from '../types';

// ---------------------------------------------------------------------------
// Base URL helpers
// ---------------------------------------------------------------------------

const getMiddlewareBase = () => {
  let url = import.meta.env.VITE_MIDDLEWARE_URL;
  if (url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('VITE_MIDDLEWARE_URL is invalid');
    }

    if (!import.meta.env.DEV && parsedUrl.protocol !== 'https:') {
      throw new Error('VITE_MIDDLEWARE_URL must use https in production');
    }

    return parsedUrl.toString().replace(/\/$/, '');
  }
  if (import.meta.env.DEV) return 'http://localhost:4000';
  throw new Error('VITE_MIDDLEWARE_URL is required in production');
};

const MIDDLEWARE_BASE = getMiddlewareBase();
const API_BASE = `${MIDDLEWARE_BASE}/api/finance`;
const PENDING_TX_KEY_STORAGE = 'ft_pending_tx_keys';

export { MIDDLEWARE_BASE };

type PendingTransactionKeys = Record<string, { key: string; createdAt: number }>;

function getPendingTransactionKeys(): PendingTransactionKeys {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(PENDING_TX_KEY_STORAGE);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as PendingTransactionKeys;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const next = Object.fromEntries(
      Object.entries(parsed).filter(([, entry]) =>
        typeof entry?.key === 'string' && typeof entry?.createdAt === 'number' && entry.createdAt >= cutoff
      )
    );

    if (Object.keys(next).length !== Object.keys(parsed).length) {
      window.localStorage.setItem(PENDING_TX_KEY_STORAGE, JSON.stringify(next));
    }

    return next;
  } catch {
    return {};
  }
}

function setPendingTransactionKeys(keys: PendingTransactionKeys): void {
  if (typeof window === 'undefined') return;

  try {
    if (Object.keys(keys).length === 0) {
      window.localStorage.removeItem(PENDING_TX_KEY_STORAGE);
      return;
    }

    window.localStorage.setItem(PENDING_TX_KEY_STORAGE, JSON.stringify(keys));
  } catch {
    // Ignore storage failures; idempotency still works best-effort for the current request.
  }
}

function buildTransactionFingerprint(transaction: Partial<Transaction>): string {
  return JSON.stringify({
    merchant: transaction.merchant || '',
    amount: transaction.amount || 0,
    date: transaction.date || '',
    category: transaction.category || '',
    type: transaction.type || '',
    account: transaction.account || '',
    currency: transaction.currency || '',
  });
}

// ---------------------------------------------------------------------------
// Generic fetch wrapper — always sends cookies for cookie-based auth
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:expired', {
      detail: { message: 'Your session expired. Please sign in again.' },
    }));
  }
  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      errorMessage = data.error || data.message || errorMessage;
    } catch {
      // response body wasn't JSON
    }
    throw new Error(errorMessage);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ---------------------------------------------------------------------------
// Finance API — ALL calls go through the Node middleware
// ---------------------------------------------------------------------------

export const financeApi = {
  // Transactions
  getTransactions: (): Promise<Transaction[]> =>
    apiFetch(`${API_BASE}/transactions`),

  createTransaction: (transaction: Partial<Transaction>): Promise<Transaction> => {
    if (!transaction.amount || !transaction.date || !transaction.merchant) {
      throw new Error('Transaction must have amount, date, and merchant');
    }

    const fingerprint = buildTransactionFingerprint(transaction);
    const pendingKeys = getPendingTransactionKeys();
    const existing = pendingKeys[fingerprint];
    const idempotencyKey = existing?.key || crypto.randomUUID();

    pendingKeys[fingerprint] = {
      key: idempotencyKey,
      createdAt: existing?.createdAt || Date.now(),
    };
    setPendingTransactionKeys(pendingKeys);

    return apiFetch<Transaction>(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(transaction),
    }).then((created) => {
      const next = getPendingTransactionKeys();
      delete next[fingerprint];
      setPendingTransactionKeys(next);
      return created;
    });
  },

  updateTransaction: (id: string, updates: Partial<Transaction>): Promise<Transaction> =>
    apiFetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  bulkUpdateTransactions: (ids: string[], updates: Partial<Transaction>): Promise<void> =>
    apiFetch(`${API_BASE}/transactions/bulk`, {
      method: 'PATCH',
      body: JSON.stringify({ ids, updates }),
    }),

  deleteTransaction: (id: string): Promise<void> =>
    apiFetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' }),

  bulkDeleteTransactions: (ids: string[]): Promise<void> =>
    apiFetch(`${API_BASE}/transactions/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Accounts
  getAccounts: (): Promise<BankAccount[]> =>
    apiFetch(`${API_BASE}/accounts`),

  createAccount: (account: Partial<BankAccount>): Promise<BankAccount> =>
    apiFetch(`${API_BASE}/accounts`, {
      method: 'POST',
      body: JSON.stringify(account),
    }),

  updateAccount: (id: string, updates: Partial<BankAccount>): Promise<BankAccount> =>
    apiFetch(`${API_BASE}/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteAccount: (id: string): Promise<void> =>
    apiFetch(`${API_BASE}/accounts/${id}`, { method: 'DELETE' }),

  // Budgets
  getBudgets: (): Promise<Budget[]> =>
    apiFetch(`${API_BASE}/budgets`),

  createBudget: (budget: Partial<Budget>): Promise<Budget> =>
    apiFetch(`${API_BASE}/budgets`, {
      method: 'POST',
      body: JSON.stringify(budget),
    }),

  updateBudget: (id: string, updates: Partial<Budget>): Promise<Budget> =>
    apiFetch(`${API_BASE}/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteBudget: (id: string): Promise<void> =>
    apiFetch(`${API_BASE}/budgets/${id}`, { method: 'DELETE' }),

  // Loans
  getLoans: (): Promise<Loan[]> =>
    apiFetch(`${API_BASE}/loans`),

  createLoan: (loan: Partial<Loan>): Promise<Loan> =>
    apiFetch(`${API_BASE}/loans`, {
      method: 'POST',
      body: JSON.stringify(loan),
    }),

  updateLoan: (id: string, updates: Partial<Loan>): Promise<Loan> =>
    apiFetch(`${API_BASE}/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteLoan: (id: string): Promise<void> =>
    apiFetch(`${API_BASE}/loans/${id}`, { method: 'DELETE' }),

  // Savings Goals
  getSavingsGoals: (): Promise<SavingsGoal[]> =>
    apiFetch(`${API_BASE}/savings-goals`),

  createSavingsGoal: (goal: Partial<SavingsGoal>): Promise<SavingsGoal> =>
    apiFetch(`${API_BASE}/savings-goals`, {
      method: 'POST',
      body: JSON.stringify(goal),
    }),

  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>): Promise<SavingsGoal> =>
    apiFetch(`${API_BASE}/savings-goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteSavingsGoal: (id: string): Promise<void> =>
    apiFetch(`${API_BASE}/savings-goals/${id}`, { method: 'DELETE' }),

  // Recurring Payments
  getRecurringPayments: (): Promise<RecurringPayment[]> =>
    apiFetch(`${API_BASE}/recurring-payments`),

  createRecurringPayment: (payment: Partial<RecurringPayment>): Promise<RecurringPayment> =>
    apiFetch(`${API_BASE}/recurring-payments`, {
      method: 'POST',
      body: JSON.stringify(payment),
    }),

  updateRecurringPayment: (id: string, updates: Partial<RecurringPayment>): Promise<RecurringPayment> =>
    apiFetch(`${API_BASE}/recurring-payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteRecurringPayment: (id: string): Promise<void> =>
    apiFetch(`${API_BASE}/recurring-payments/${id}`, { method: 'DELETE' }),

  // Income Sources
  getIncomeSources: (): Promise<IncomeSource[]> =>
    apiFetch(`${API_BASE}/income-sources`),

  createIncomeSource: (income: Partial<IncomeSource>): Promise<IncomeSource> =>
    apiFetch(`${API_BASE}/income-sources`, {
      method: 'POST',
      body: JSON.stringify(income),
    }),

  updateIncomeSource: (id: string, updates: Partial<IncomeSource>): Promise<IncomeSource> =>
    apiFetch(`${API_BASE}/income-sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteIncomeSource: (id: string): Promise<void> =>
    apiFetch(`${API_BASE}/income-sources/${id}`, { method: 'DELETE' }),

  // Investments
  getInvestments: (): Promise<Investment[]> =>
    apiFetch(`${API_BASE}/investments`),

  createInvestment: (investment: Partial<Investment>): Promise<Investment> =>
    apiFetch(`${API_BASE}/investments`, {
      method: 'POST',
      body: JSON.stringify(investment),
    }),

  updateInvestment: (id: string, updates: Partial<Investment>): Promise<Investment> =>
    apiFetch(`${API_BASE}/investments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteInvestment: (id: string): Promise<void> =>
    apiFetch(`${API_BASE}/investments/${id}`, { method: 'DELETE' }),

  // AI Insights
  getAIInsights: (transactions: any[], selectedBank: string): Promise<any[]> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/insights`, {
      method: 'POST',
      body: JSON.stringify({ transactions, selectedBank }),
    }),

  sendAIChat: (message: string, history: any[], transactions: any[]): Promise<{ content: string }> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, history, transactions }),
    }),

  // ---------------------------------------------------------------------------
  // Server-side AI endpoints (ISSUE-001 fix — no Gemini key on client)
  // ---------------------------------------------------------------------------

  processAIInput: (input: string, context: { savingsGoals: any[]; accounts?: any[] }): Promise<any[]> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/process-input`, {
      method: 'POST',
      body: JSON.stringify({ input, savingsGoals: context.savingsGoals, accounts: context.accounts || [] }),
    }),

  categorizeAI: (targets: { id: string; merchant: string; amount: number; currentCategory?: string }[]): Promise<Record<string, { category: string; confidence: number }[]>> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/categorize`, {
      method: 'POST',
      body: JSON.stringify({ targets }),
    }),

  analyzeAIFile: (base64Data: string, mimeType: string, type: 'bill' | 'statement', accounts: any[] = []): Promise<any[]> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/analyze-file`, {
      method: 'POST',
      body: JSON.stringify({ base64Data, mimeType, type, accounts }),
    }),

  oracleChat: (message: string, history: { role: string; content: string }[]): Promise<{ content: string }> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/oracle`, {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),

  getFamily: async (familyId: string): Promise<FamilyAccount> => {
    const res = await apiFetch<FamilyAccount>(`${MIDDLEWARE_BASE}/api/auth/family/${familyId}`);
    return res;
  },
};

// ---------------------------------------------------------------------------
// Family API (U2/U3)
// ---------------------------------------------------------------------------

export const familyApi = {
  createFamily: (name: string, adminName: string): Promise<FamilyAccount> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/auth/family`, {
      method: 'POST',
      body: JSON.stringify({ name, adminName }),
    }),

  getFamily: (familyId: string): Promise<FamilyAccount> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/auth/family/${familyId}`),

  addFamilyMember: (familyId: string, name: string, role: string): Promise<FamilyAccount> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/auth/family/${familyId}/members`, {
      method: 'POST',
      body: JSON.stringify({ name, role }),
    }),

  removeFamilyMember: (familyId: string, uid: string): Promise<FamilyAccount> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/auth/family/${familyId}/members/${uid}`, {
      method: 'DELETE',
    }),

  deleteFamily: (familyId: string): Promise<void> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/auth/family/${familyId}`, {
      method: 'DELETE',
    }),
};

// ---------------------------------------------------------------------------
// Audit Log API (U10)
// ---------------------------------------------------------------------------

export const auditApi = {
  syncAuditLogs: (logs: AuditLog[]): Promise<void> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/auth/audit/logs`, {
      method: 'POST',
      body: JSON.stringify({ logs }),
    }),

  getAuditLogs: (): Promise<AuditLog[]> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/auth/audit/logs`),
};

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const authApi = {
  login: async (email: string, password: string): Promise<any> => {
    const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Login failed');
    }
    return res.json();
  },

  register: async (name: string, email: string, password: string): Promise<any> => {
    const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Registration failed');
    }
    return res.json();
  },

  logout: async (): Promise<void> => {
    await fetch(`${MIDDLEWARE_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  me: async (): Promise<{ user: { uid: string; email: string; name: string } } | null> => {
    const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/me`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    return res.json();
  },

  forgotPassword: async (email: string, newPassword?: string): Promise<void> => {
    const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Password reset failed');
    }
  },

  resetPassword: async (email: string, otp: string, newPassword: string): Promise<void> => {
    const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/reset-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Password reset failed');
    }
  },
};
