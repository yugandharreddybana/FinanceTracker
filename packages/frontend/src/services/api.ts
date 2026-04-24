import { Transaction, BankAccount, Budget, Loan, SavingsGoal, RecurringPayment, IncomeSource, Investment } from '../types';

// ---------------------------------------------------------------------------
// Base URL helpers
// ---------------------------------------------------------------------------

const getMiddlewareBase = () => {
  let url = import.meta.env.VITE_MIDDLEWARE_URL;
  if (url) {
    // Ensure it's an absolute URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url;
  }
  if (import.meta.env.DEV) return 'http://localhost:4000';
  return window.location.origin;
};

const MIDDLEWARE_BASE = getMiddlewareBase();
const API_BASE = `${MIDDLEWARE_BASE}/api/finance`;

export { MIDDLEWARE_BASE };

// ---------------------------------------------------------------------------
// Auth header helper — attaches JWT to every request
// ---------------------------------------------------------------------------

const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ---------------------------------------------------------------------------
// Generic fetch wrapper with error handling
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });
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
  // 204 No Content
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
      body: JSON.stringify({ ids })
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

  processAIInput: (input: string, savingsGoals: any[]): Promise<any[]> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/process-input`, {
      method: 'POST',
      body: JSON.stringify({ input, savingsGoals }),
    }),

  categorizeAI: (targets: any[]): Promise<Record<string, any[]>> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/categorize`, {
      method: 'POST',
      body: JSON.stringify({ targets }),
    }),

  analyzeAIFile: (base64Data: string, mimeType: string, type: 'bill' | 'statement'): Promise<any[]> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/analyze-file`, {
      method: 'POST',
      body: JSON.stringify({ base64Data, mimeType, type }),
    }),

  oracleChat: (message: string, history: any[]): Promise<{ content: string }> =>
    apiFetch(`${MIDDLEWARE_BASE}/api/ai/oracle`, {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),
};


// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const authApi = {
  login: async (email: string, password: string): Promise<any> => {
    const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/login`, {
      method: 'POST',
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Registration failed');
    }
    return res.json();
  },
};
