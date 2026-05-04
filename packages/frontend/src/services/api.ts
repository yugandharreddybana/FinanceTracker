import { Transaction, BankAccount, Budget, Loan, SavingsGoal, RecurringPayment, IncomeSource, Investment } from '../types';

// ---------------------------------------------------------------------------
// Base URL helpers
// ---------------------------------------------------------------------------

const getMiddlewareBase = () => {
  let url = import.meta.env.VITE_MIDDLEWARE_URL;
  if (url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url;
  }
  // M7: Warn loudly in production if middleware URL is not configured
  if (!import.meta.env.DEV) {
    console.error('[api] VITE_MIDDLEWARE_URL is not set! All API calls will fail. Set this in Vercel environment variables.');
  }
  return import.meta.env.DEV ? 'http://localhost:4000' : '';
};

const MIDDLEWARE_BASE = getMiddlewareBase();
const API_BASE = `${MIDDLEWARE_BASE}/api/finance`;

export { MIDDLEWARE_BASE };

// ---------------------------------------------------------------------------
// Generic fetch wrapper — always sends cookies for cookie-based auth
// E3: Retry logic for network errors and 5xx responses
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string, options: RequestInit = {}, retries = 2, retryDelay = 1000): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      console.warn('[apiFetch] Retry attempt', attempt, 'for', url);
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }

    try {
      const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });

      // Do not retry on 4xx (client errors)
      if (res.status >= 400 && res.status < 500) {
        let errorMessage = `Request failed (${res.status})`;
        try {
          const data = await res.json();
          errorMessage = data.error || data.message || errorMessage;
        } catch {
          // response body wasn't JSON
        }
        throw new Error(errorMessage);
      }

      // Retry on 5xx
      if (res.status >= 500) {
        lastError = new Error(`Request failed (${res.status})`);
        if (attempt < retries) continue;
        throw lastError;
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
    } catch (err: any) {
      // Network error — retry
      if (err instanceof TypeError && attempt < retries) {
        lastError = err;
        continue;
      }
      // Non-retryable or exhausted retries
      throw err;
    }
  }

  throw lastError || new Error('Request failed after retries');
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
    return apiFetch(`${API_BASE}/transactions`, {
      method: 'POST',
      body: JSON.stringify(transaction),
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

  processAIInput: (input: string, context: { savingsGoals: any[] }): Promise<any[]> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/process-input`, {
      method: 'POST',
      body: JSON.stringify({ input, savingsGoals: context.savingsGoals }),
    }),

  categorizeAI: (targets: { id: string; merchant: string; amount: number }[]): Promise<Record<string, { category: string; confidence: number }[]>> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/categorize`, {
      method: 'POST',
      body: JSON.stringify({ targets }),
    }),

  analyzeAIFile: (base64Data: string, mimeType: string, type: 'bill' | 'statement'): Promise<any[]> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/analyze-file`, {
      method: 'POST',
      body: JSON.stringify({ base64Data, mimeType, type }),
    }),

  oracleChat: (message: string, history: { role: string; content: string }[]): Promise<{ content: string }> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/oracle`, {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),

  getFamily: async (familyId: string) => {
    const res = await apiFetch(`${MIDDLEWARE_BASE}/api/auth/family/${familyId}`);
    return res;
  },
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

  forgotPassword: async (email: string): Promise<void> => {
    const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
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

  refreshToken: async (): Promise<{ user: { uid: string; email: string; name: string } } | null> => {
    const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return res.json();
  },
};
