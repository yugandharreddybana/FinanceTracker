import { Transaction, BankAccount, Budget, Loan, SavingsGoal, RecurringPayment, IncomeSource, Investment } from '../types';

const getApiBase = () => {
  const env = (import.meta as any).env;
  const url = env?.VITE_API_URL;

  if (url) return `${url}/api/finance`;

  // In development, default to localhost
  if (env?.MODE === 'development') {
    return 'http://localhost:8080/api/finance';
  }

  // In production, if VITE_API_URL is missing, we try a relative path 
  // to avoid hitting the loopback/localhost and causing browser blocks.
  return '/api/finance';
};

const API_BASE = getApiBase();

const getMiddlewareBase = () => {
  const env = (import.meta as any).env;
  const url = env?.VITE_MIDDLEWARE_URL;

  if (url) return url;

  // In development, default to localhost:4000
  if (env?.MODE === 'development') {
    return 'http://localhost:4000';
  }

  // Fallback for production: try to use the same domain 
  // or a relative path if middleware is not separately defined.
  return `${window.location.origin}/api/middleware`;
};

const MIDDLEWARE_BASE = getMiddlewareBase();

export { API_BASE, MIDDLEWARE_BASE };

export const financeApi = {
  // Transactions
  getTransactions: async (): Promise<Transaction[]> => {
    const res = await fetch(`${API_BASE}/transactions`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },
  createTransaction: async (transaction: Partial<Transaction>): Promise<Transaction> => {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    if (!res.ok) throw new Error('Failed to create transaction');
    return res.json();
  },
  updateTransaction: async (id: string, updates: Partial<Transaction>): Promise<Transaction> => {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update transaction');
    return res.json();
  },
  bulkUpdateTransactions: async (ids: string[], updates: Partial<Transaction>): Promise<void> => {
    const res = await fetch(`${API_BASE}/transactions/bulk`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates }),
    });
    if (!res.ok) throw new Error('Failed to bulk update transactions');
  },
  deleteTransaction: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete transaction');
  },
  bulkDeleteTransactions: async (ids: string[]): Promise<void> => {
    const res = await fetch(`${API_BASE}/transactions/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error('Failed to bulk delete transactions');
  },

  // Accounts
  getAccounts: async (): Promise<BankAccount[]> => {
    const res = await fetch(`${API_BASE}/accounts`);
    if (!res.ok) throw new Error('Failed to fetch accounts');
    return res.json();
  },
  createAccount: async (account: Partial<BankAccount>): Promise<BankAccount> => {
    const res = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
    if (!res.ok) throw new Error('Failed to create account');
    return res.json();
  },
  updateAccount: async (id: string, updates: Partial<BankAccount>): Promise<BankAccount> => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update account');
    return res.json();
  },
  deleteAccount: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete account');
  },

  // Budgets
  getBudgets: async (): Promise<Budget[]> => {
    const res = await fetch(`${API_BASE}/budgets`);
    if (!res.ok) throw new Error('Failed to fetch budgets');
    return res.json();
  },
  createBudget: async (budget: Partial<Budget>): Promise<Budget> => {
    const res = await fetch(`${API_BASE}/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(budget),
    });
    if (!res.ok) throw new Error('Failed to create budget');
    return res.json();
  },
  updateBudget: async (id: string, updates: Partial<Budget>): Promise<Budget> => {
    const res = await fetch(`${API_BASE}/budgets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update budget');
    return res.json();
  },
  deleteBudget: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/budgets/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete budget');
  },

  // Loans
  getLoans: async (): Promise<Loan[]> => {
    const res = await fetch(`${API_BASE}/loans`);
    if (!res.ok) throw new Error('Failed to fetch loans');
    return res.json();
  },
  createLoan: async (loan: Partial<Loan>): Promise<Loan> => {
    const res = await fetch(`${API_BASE}/loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loan),
    });
    if (!res.ok) throw new Error('Failed to create loan');
    return res.json();
  },
  updateLoan: async (id: string, updates: Partial<Loan>): Promise<Loan> => {
    const res = await fetch(`${API_BASE}/loans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update loan');
    return res.json();
  },
  deleteLoan: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/loans/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete loan');
  },

  // Savings Goals
  getSavingsGoals: async (): Promise<SavingsGoal[]> => {
    const res = await fetch(`${API_BASE}/savings-goals`);
    if (!res.ok) throw new Error('Failed to fetch savings goals');
    return res.json();
  },
  createSavingsGoal: async (goal: Partial<SavingsGoal>): Promise<SavingsGoal> => {
    const res = await fetch(`${API_BASE}/savings-goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error('Failed to create savings goal');
    return res.json();
  },
  updateSavingsGoal: async (id: string, updates: Partial<SavingsGoal>): Promise<SavingsGoal> => {
    const res = await fetch(`${API_BASE}/savings-goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update savings goal');
    return res.json();
  },
  deleteSavingsGoal: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/savings-goals/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete savings goal');
  },

  // Recurring Payments
  getRecurringPayments: async (): Promise<RecurringPayment[]> => {
    const res = await fetch(`${API_BASE}/recurring-payments`);
    if (!res.ok) throw new Error('Failed to fetch recurring payments');
    return res.json();
  },
  createRecurringPayment: async (payment: Partial<RecurringPayment>): Promise<RecurringPayment> => {
    const res = await fetch(`${API_BASE}/recurring-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    if (!res.ok) throw new Error('Failed to create recurring payment');
    return res.json();
  },
  updateRecurringPayment: async (id: string, updates: Partial<RecurringPayment>): Promise<RecurringPayment> => {
    const res = await fetch(`${API_BASE}/recurring-payments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update recurring payment');
    return res.json();
  },
  deleteRecurringPayment: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/recurring-payments/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete recurring payment');
  },

  // Income Sources
  getIncomeSources: async (): Promise<IncomeSource[]> => {
    const res = await fetch(`${API_BASE}/income-sources`);
    if (!res.ok) throw new Error('Failed to fetch income sources');
    return res.json();
  },
  createIncomeSource: async (income: Partial<IncomeSource>): Promise<IncomeSource> => {
    const res = await fetch(`${API_BASE}/income-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(income),
    });
    if (!res.ok) throw new Error('Failed to create income source');
    return res.json();
  },
  updateIncomeSource: async (id: string, updates: Partial<IncomeSource>): Promise<IncomeSource> => {
    const res = await fetch(`${API_BASE}/income-sources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update income source');
    return res.json();
  },
  deleteIncomeSource: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/income-sources/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete income source');
  },

  // Investments
  getInvestments: async (): Promise<Investment[]> => {
    const res = await fetch(`${API_BASE}/investments`);
    if (!res.ok) throw new Error('Failed to fetch investments');
    return res.json();
  },
  createInvestment: async (investment: Partial<Investment>): Promise<Investment> => {
    const res = await fetch(`${API_BASE}/investments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(investment),
    });
    if (!res.ok) throw new Error('Failed to create investment');
    return res.json();
  },
  updateInvestment: async (id: string, updates: Partial<Investment>): Promise<Investment> => {
    const res = await fetch(`${API_BASE}/investments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update investment');
    return res.json();
  },
  deleteInvestment: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/investments/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete investment');
  },

  // AI Insights
  getAIInsights: async (transactions: any[], selectedBank: string): Promise<any[]> => {
    const res = await fetch(`${MIDDLEWARE_BASE}/api/ai/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions, selectedBank }),
    });
    if (!res.ok) throw new Error('Failed to fetch AI insights');
    return res.json();
  },
  sendAIChat: async (message: string, history: any[], transactions: any[]): Promise<{ content: string }> => {
    const res = await fetch(`${MIDDLEWARE_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, transactions }),
    });
    if (!res.ok) throw new Error('Failed to send AI chat');
    return res.json();
  },
};

export const authApi = {
  login: async (email: string, password: string): Promise<any> => {
    const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }
    return res.json();
  },
  register: async (name: string, email: string, password: string): Promise<any> => {
    const res = await fetch(`${MIDDLEWARE_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Registration failed");
    }
    return res.json();
  },
};
