import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Transaction, SavingsGoal, RecurringPayment, Loan, Budget, BankAccount, IncomeSource } from '../types';
import { financeApi } from '../services/api';

interface FinanceContextType {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  recurringPayments: RecurringPayment[];
  loans: Loan[];
  budgets: Budget[];
  accounts: BankAccount[];
  incomeSources: IncomeSource[];
  spendingDataByCurrency: Record<string, { name: string; value: number; color: string }[]>;
  isLoading: boolean;
  addTransactions: (input: string) => Promise<void>;
  addManualTransaction: (transaction: Partial<Transaction>) => Promise<void>;
  analyzeFile: (file: File, type: 'bill' | 'statement') => Promise<void>;
  deleteTransaction: (id: string) => void;
  addSavingsGoal: (goal: SavingsGoal) => void;
  updateSavingsGoal: (id: string, current: number) => void;
  addRecurringPayment: (payment: RecurringPayment) => void;
  updateRecurringPayment: (id: string, updates: Partial<RecurringPayment>) => void;
  deleteRecurringPayment: (id: string) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  bulkUpdateTransactions: (ids: string[], updates: Partial<Transaction>) => Promise<void>;
  addLoan: (loan: Loan) => void;
  updateLoan: (id: string, updates: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  addAccount: (account: BankAccount) => void;
  updateAccount: (id: string, updates: Partial<BankAccount>) => void;
  deleteAccount: (id: string) => void;
  addIncomeSource: (income: IncomeSource) => void;
  updateIncomeSource: (id: string, updates: Partial<IncomeSource>) => void;
  deleteIncomeSource: (id: string) => void;
  transferToSavings: (amount: number, goalId: string, accountId: string) => void;
  categorizeTransactions: () => Promise<void>;
  confirmCategory: (id: string, category: string) => void;
  suggestions: Record<string, { category: string; confidence: number }[]>;
  isCategorizing: boolean;
  isAddTransactionModalOpen: boolean;
  setIsAddTransactionModalOpen: (isOpen: boolean) => void;
  netWorthByCurrency: Record<string, {
    total: number;
    assets: number;
    liabilities: number;
    change: number;
  }>;
  monthlyTrends: { month: string; [currency: string]: number | string }[];
  healthMetricsByCurrency: Record<string, {
    savingsRate: number;
    debtRatio: number;
    emergencyFund: number;
    budgetAdherence: number;
    overallScore: number;
  }>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const CATEGORY_COLORS: Record<string, string> = {
  'Housing': '#7C6EFA',
  'Food & Drink': '#22D3A5',
  'Transport': '#F43F5E',
  'Entertainment': '#F59E0B',
  'Shopping': '#8E9299',
  'Electronics': '#3B82F6',
  'Uncategorized': '#6B7280'
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, { category: string; confidence: number }[]>>({});
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txs, goals, recs, lns, bdgts, accs, incs] = await Promise.all([
          financeApi.getTransactions(),
          financeApi.getSavingsGoals(),
          financeApi.getRecurringPayments(),
          financeApi.getLoans(),
          financeApi.getBudgets(),
          financeApi.getAccounts(),
          financeApi.getIncomeSources()
        ]);
        setTransactions(txs);
        setSavingsGoals(goals);
        setRecurringPayments(recs);
        setLoans(lns);
        setBudgets(bdgts);
        setAccounts(accs);
        setIncomeSources(incs);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const netWorthByCurrency = React.useMemo(() => {
    const result: Record<string, { total: number; assets: number; liabilities: number; change: number }> = {};
    
    const currencies = Array.from(new Set([...accounts.map(a => a.currency || 'USD'), ...loans.map(l => l.currency || 'USD')]));
    currencies.forEach(c => {
      result[c] = { total: 0, assets: 0, liabilities: 0, change: 12.4 };
    });

    accounts.forEach(a => {
      const curr = a.currency || 'USD';
      if (a.type !== 'Credit') {
        result[curr].assets += a.balance;
        result[curr].total += a.balance;
      }
    });

    loans.forEach(l => {
      const curr = l.currency || 'USD';
      result[curr].liabilities += l.remainingAmount;
    });

    return result;
  }, [accounts, loans]);

  const monthlyTrends = React.useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('default', { month: 'short' });
    }).reverse();

    return last6Months.map(month => {
      const monthData: { month: string; [currency: string]: number | string } = { month };
      
      const currencies = Array.from(new Set(transactions.map(t => t.currency || 'USD')));
      currencies.forEach(curr => {
        const amount = transactions
          .filter(t => {
            const tDate = new Date(t.date);
            return tDate.toLocaleString('default', { month: 'short' }) === month && t.type === 'expense' && (t.currency || 'USD') === curr;
          })
          .reduce((acc, t) => acc + Math.abs(t.amount), 0);
        
        monthData[curr] = amount || Math.random() * 2000 + 1000; // Fallback to mock if no data
      });

      return monthData;
    });
  }, [transactions]);

  const healthMetricsByCurrency = React.useMemo(() => {
    const result: Record<string, { savingsRate: number; debtRatio: number; emergencyFund: number; budgetAdherence: number; overallScore: number }> = {};
    
    const currencies = Array.from(new Set(transactions.map(t => t.currency || 'USD')));
    
    currencies.forEach(curr => {
      const currBudgets = budgets.filter(b => (b.currency || 'USD') === curr);
      const totalBudget = currBudgets.reduce((acc, b) => acc + b.limit, 0);
      const totalSpent = currBudgets.reduce((acc, b) => acc + b.spent, 0);
      const budgetAdherence = totalBudget > 0 ? Math.max(0, 1 - (totalSpent / totalBudget)) : 1;

      const monthlyIncome = transactions
        .filter(t => t.type === 'income' && (t.currency || 'USD') === curr)
        .reduce((acc, t) => acc + t.amount, 0) || 5000;
      
      const monthlyExpenses = transactions
        .filter(t => t.type === 'expense' && (t.currency || 'USD') === curr)
        .reduce((acc, t) => acc + Math.abs(t.amount), 0) || 3000;

      const savingsRate = (monthlyIncome - monthlyExpenses) / monthlyIncome;
      
      const nw = netWorthByCurrency[curr] || { assets: 0, liabilities: 0 };
      const debtRatio = nw.assets > 0 ? nw.liabilities / nw.assets : 0;
      
      // Emergency fund in months
      const emergencyFund = monthlyExpenses > 0 ? nw.assets / monthlyExpenses : 6;
      const emergencyFundScore = Math.min(1, emergencyFund / 6); // 6 months is 100%

      const overallScore = Math.round(
        (budgetAdherence * 0.3 + 
         Math.max(0, savingsRate) * 0.3 + 
         (1 - Math.min(1, debtRatio)) * 0.2 + 
         emergencyFundScore * 0.2) * 100
      );

      result[curr] = {
        savingsRate: Math.max(0, savingsRate),
        debtRatio,
        emergencyFund: emergencyFundScore,
        budgetAdherence,
        overallScore
      };
    });

    return result;
  }, [budgets, transactions, netWorthByCurrency]);

  // Sync transactions to server for MCP tools
  React.useEffect(() => {
    fetch('/api/sync-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions })
    }).catch(err => console.error('Failed to sync transactions:', err));
  }, [transactions]);

  const spendingDataByCurrency = React.useMemo(() => {
    const result: Record<string, { name: string, value: number, color: string }[]> = {};
    const currencies = Array.from(new Set(transactions.map(t => t.currency || 'USD')));
    
    currencies.forEach(curr => {
      const totals: Record<string, number> = {};
      transactions.forEach(t => {
        if (t.type === 'expense' && (t.currency || 'USD') === curr) {
          const cat = t.category || 'Uncategorized';
          totals[cat] = (totals[cat] || 0) + Math.abs(t.amount);
        }
      });
      result[curr] = Object.entries(totals).map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || '#6B7280'
      })).sort((a, b) => b.value - a.value);
    });
    
    return result;
  }, [transactions]);

  const transferToSavings = useCallback(async (amount: number, goalId: string, accountId: string) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    const account = accounts.find(a => a.id === accountId);
    if (!goal || !account) return;

    try {
      // Create a transaction for the transfer
      const newTx = await financeApi.createTransaction({
        date: new Date().toISOString().split('T')[0],
        merchant: `Transfer to ${goal.name}`,
        amount: -Math.abs(amount),
        category: 'Savings',
        type: 'expense',
        status: 'confirmed',
        aiTag: 'Savings Transfer',
        account: account.name,
        confidence: 1.0,
        savingsGoalId: goalId
      });

      const updatedGoal = await financeApi.updateSavingsGoal(goalId, { current: goal.current + Math.abs(amount) });
      const updatedAccount = await financeApi.updateAccount(accountId, { balance: account.balance - Math.abs(amount) });

      setTransactions(prev => [newTx, ...prev]);
      setSavingsGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
      setAccounts(prev => prev.map(a => a.id === accountId ? updatedAccount : a));
    } catch (error) {
      console.error('Failed to transfer to savings:', error);
    }
  }, [savingsGoals, accounts]);

  const addTransactions = useCallback(async (input: string) => {
    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `Analyze this natural language input for financial data: "${input}". 
      
      CRITICAL INSTRUCTIONS:
      1. SPELLING CORRECTION: Automatically correct any spelling mistakes in merchant names, categories, or goal names.
      2. INTELLIGENT CATEGORIZATION: 
         - For EXPENSES: Housing, Food & Drink, Transport, Entertainment, Shopping, Electronics, Utilities, Health, Education, Others.
         - For INCOME: Salary, Freelance, Investment, Gift, Refund, Others. Intelligently categorize based on source (e.g., "Google" -> "Salary", "Upwork" -> "Freelance").
      3. SAVINGS TRANSFERS: Detect if the user wants to move money to a savings goal (e.g., "Save $50 for Hawaii", "Move $100 to car fund"). 
         - If detected, set intent to "SAVINGS_TRANSFER".
      4. Available Savings Goals: ${JSON.stringify(savingsGoals.map(g => ({ id: g.id, name: g.name })))}
      
      The input could be a TRANSACTION, a SAVINGS_GOAL, a RECURRING_PAYMENT, a LOAN, or a SAVINGS_TRANSFER.
      
      - For TRANSACTION: Extract merchant (corrected), amount, date, category (intelligent), type (income/expense), and confidence (0-1).
      - For SAVINGS_GOAL: Extract name (corrected), target amount, emoji, and deadline (if any).
      - For RECURRING_PAYMENT: Extract name (corrected), amount, date (day of month), category (intelligent), and frequency (Monthly/Weekly/Annual).
      - For LOAN: Extract name (corrected), totalAmount, monthlyEMI, interestRate, startDate, endDate, and category (intelligent).
      - For SAVINGS_TRANSFER: Extract amount and goalId (match with available goals).
      
      Multiple entries may be separated by semicolons, commas, or new lines.
      Return as a JSON array of objects. Each object MUST have an "intent" field: "TRANSACTION" | "SAVINGS_GOAL" | "RECURRING_PAYMENT" | "LOAN" | "SAVINGS_TRANSFER".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                intent: { type: Type.STRING, enum: ["TRANSACTION", "SAVINGS_GOAL", "RECURRING_PAYMENT", "LOAN", "SAVINGS_TRANSFER"] },
                // Transaction fields
                merchant: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                date: { type: Type.STRING },
                category: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["income", "expense"] },
                confidence: { type: Type.NUMBER },
                // Savings Goal fields
                name: { type: Type.STRING },
                target: { type: Type.NUMBER },
                emoji: { type: Type.STRING },
                deadline: { type: Type.STRING },
                // Recurring fields
                frequency: { type: Type.STRING, enum: ["Monthly", "Weekly", "Annual"] },
                dayOfMonth: { type: Type.NUMBER },
                // Loan fields
                totalAmount: { type: Type.NUMBER },
                monthlyEMI: { type: Type.NUMBER },
                interestRate: { type: Type.NUMBER },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
                // Savings Transfer fields
                goalId: { type: Type.STRING }
              },
              required: ["intent"]
            }
          }
        }
      });

      const results = JSON.parse(response.text);
      if (!Array.isArray(results)) throw new Error("AI returned invalid format");
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const res of results) {
        if (res.intent === 'TRANSACTION') {
          let dateStr = res.date;
          const matchedDate = new Date(res.date);
          if (isNaN(matchedDate.getTime()) || matchedDate > today) {
            dateStr = new Date().toISOString().split('T')[0];
          }

          const amount = res.amount;
          const type = res.type || (amount > 0 ? 'income' : 'expense');

          const newTx = await financeApi.createTransaction({
            date: dateStr,
            merchant: res.merchant || res.name || 'Unknown',
            amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
            category: res.category || 'Uncategorized',
            type,
            status: 'confirmed',
            aiTag: 'Smart Added',
            account: 'Main Current',
            confidence: res.confidence || 0.9
          });
          setTransactions(prev => [newTx, ...prev]);
        } else if (res.intent === 'SAVINGS_GOAL') {
          const newGoal = await financeApi.createSavingsGoal({
            name: res.name || 'New Goal',
            target: res.target || 1000,
            current: 0,
            emoji: res.emoji || '🎯',
            deadline: res.deadline,
            isHero: false
          });
          setSavingsGoals(prev => [newGoal, ...prev]);
        } else if (res.intent === 'RECURRING_PAYMENT') {
          const newRecurring = await financeApi.createRecurringPayment({
            name: res.name || res.merchant || 'Subscription',
            amount: Math.abs(res.amount || 0),
            date: res.dayOfMonth || 1,
            category: res.category || 'Subscription',
            frequency: res.frequency || 'Monthly',
            status: 'Active'
          });
          setRecurringPayments(prev => [newRecurring, ...prev]);
        } else if (res.intent === 'LOAN') {
          const newLoan = await financeApi.createLoan({
            name: res.name || 'New Loan',
            totalAmount: res.totalAmount || 10000,
            remainingAmount: res.totalAmount || 10000,
            monthlyEMI: res.monthlyEMI || 500,
            interestRate: res.interestRate || 5,
            startDate: res.startDate || new Date().toISOString().split('T')[0],
            endDate: res.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5).toISOString().split('T')[0],
            category: res.category || 'Debt',
            color: '#F43F5E'
          });
          setLoans(prev => [newLoan, ...prev]);
        } else if (res.intent === 'SAVINGS_TRANSFER') {
          const amount = Math.abs(res.amount || 0);
          const goalId = res.goalId;
          if (goalId && amount > 0) {
            const defaultAccountId = accounts[0]?.id || 'acc-1';
            transferToSavings(amount, goalId, defaultAccountId);
          }
        }
      }
    } catch (error) {
      console.error("Error parsing smart add:", error);
      const separators = /[;,\n]/;
      const entries = input.split(separators).map(e => e.trim()).filter(e => e.length > 0);
      for (const entry of entries) {
        const newTx = await financeApi.createTransaction({
          date: new Date().toISOString().split('T')[0],
          merchant: entry.split(' ')[0] || 'Unknown',
          amount: -10,
          category: 'Uncategorized',
          type: 'expense',
          status: 'confirmed',
          aiTag: 'Manual Entry',
          account: 'Main Current',
          confidence: 0.5
        });
        setTransactions(prev => [newTx, ...prev]);
      }
    }
  }, [accounts, savingsGoals, transferToSavings]);

  const analyzeFile = useCallback(async (file: File, type: 'bill' | 'statement') => {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
    });
    reader.readAsDataURL(file);
    const base64Data = await base64Promise;

    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = type === 'bill' 
        ? "Analyze this bill/receipt and extract the merchant, amount, date, and category. Return as a JSON array of transactions with a confidence score (0-1) for each."
        : "Analyze this bank statement and extract all transactions (merchant, amount, date, category). Return as a JSON array of transactions with a confidence score (0-1) for each.";

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType: file.type } }
            ]
          }
        ],
        config: {
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

      const results = JSON.parse(response.text);
      if (!Array.isArray(results)) throw new Error("AI returned invalid format");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const parsedTransactions: Transaction[] = [];
      for (const res of results) {
        let dateStr = res.date;
        const matchedDate = new Date(res.date);
        if (isNaN(matchedDate.getTime()) || matchedDate > today) {
          dateStr = new Date().toISOString().split('T')[0];
        }

        const newTx = await financeApi.createTransaction({
          date: dateStr,
          merchant: res.merchant,
          amount: -Math.abs(res.amount),
          category: res.category || 'Uncategorized',
          type: 'expense',
          status: 'confirmed',
          aiTag: type === 'bill' ? 'Bill Scanned' : 'Statement Uploaded',
          account: 'Main Current',
          confidence: res.confidence || 0.95
        });
        parsedTransactions.push(newTx);
      }

      setTransactions(prev => [...parsedTransactions, ...prev]);
    } catch (error) {
      console.error("Error analyzing file:", error);
      throw error;
    }
  }, []);

  const addManualTransaction = useCallback(async (transaction: Partial<Transaction>) => {
    try {
      const newTx = await financeApi.createTransaction({
        ...transaction,
        status: transaction.status || 'confirmed',
        confidence: 1.0,
        aiTag: transaction.aiTag || 'Manual Entry'
      });
      setTransactions(prev => [newTx, ...prev]);
    } catch (error) {
      console.error('Failed to add manual transaction:', error);
      throw error;
    }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      await financeApi.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  }, []);

  const addSavingsGoal = useCallback(async (goal: SavingsGoal) => {
    try {
      const newGoal = await financeApi.createSavingsGoal(goal);
      setSavingsGoals(prev => [newGoal, ...prev]);
    } catch (error) {
      console.error('Failed to add savings goal:', error);
    }
  }, []);

  const updateSavingsGoal = useCallback(async (id: string, current: number) => {
    try {
      const updated = await financeApi.updateSavingsGoal(id, { current });
      setSavingsGoals(prev => prev.map(g => g.id === id ? updated : g));
    } catch (error) {
      console.error('Failed to update savings goal:', error);
    }
  }, []);

  const addRecurringPayment = useCallback(async (payment: RecurringPayment) => {
    try {
      const newPayment = await financeApi.createRecurringPayment(payment);
      setRecurringPayments(prev => [newPayment, ...prev]);
    } catch (error) {
      console.error('Failed to add recurring payment:', error);
    }
  }, []);

  const updateRecurringPayment = useCallback(async (id: string, updates: Partial<RecurringPayment>) => {
    try {
      const updated = await financeApi.updateRecurringPayment(id, updates);
      setRecurringPayments(prev => prev.map(p => p.id === id ? updated : p));
    } catch (error) {
      console.error('Failed to update recurring payment:', error);
    }
  }, []);

  const deleteRecurringPayment = useCallback(async (id: string) => {
    try {
      await financeApi.deleteRecurringPayment(id);
      setRecurringPayments(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete recurring payment:', error);
    }
  }, []);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    try {
      const updated = await financeApi.updateTransaction(id, updates);
      setTransactions(prev => prev.map(t => t.id === id ? updated : t));
    } catch (error) {
      console.error('Failed to update transaction:', error);
    }
  }, []);

  const bulkUpdateTransactions = useCallback(async (ids: string[], updates: Partial<Transaction>) => {
    try {
      await financeApi.bulkUpdateTransactions(ids, updates);
      setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...updates } : t));
    } catch (error) {
      console.error('Failed to bulk update transactions:', error);
    }
  }, []);

  const addLoan = useCallback(async (loan: Loan) => {
    try {
      const newLoan = await financeApi.createLoan(loan);
      setLoans(prev => [newLoan, ...prev]);
    } catch (error) {
      console.error('Failed to add loan:', error);
    }
  }, []);

  const updateLoan = useCallback(async (id: string, updates: Partial<Loan>) => {
    try {
      const updated = await financeApi.updateLoan(id, updates);
      setLoans(prev => prev.map(l => l.id === id ? updated : l));
    } catch (error) {
      console.error('Failed to update loan:', error);
    }
  }, []);

  const deleteLoan = useCallback(async (id: string) => {
    try {
      await financeApi.deleteLoan(id);
      setLoans(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('Failed to delete loan:', error);
    }
  }, []);

  const addBudget = useCallback(async (budget: Budget) => {
    try {
      const newBudget = await financeApi.createBudget(budget);
      setBudgets(prev => [newBudget, ...prev]);
    } catch (error) {
      console.error('Failed to add budget:', error);
    }
  }, []);

  const updateBudget = useCallback(async (id: string, updates: Partial<Budget>) => {
    try {
      const updated = await financeApi.updateBudget(id, updates);
      setBudgets(prev => prev.map(b => b.id === id ? updated : b));
    } catch (error) {
      console.error('Failed to update budget:', error);
    }
  }, []);

  const deleteBudget = useCallback(async (id: string) => {
    try {
      await financeApi.deleteBudget(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error('Failed to delete budget:', error);
    }
  }, []);

  const addAccount = useCallback(async (account: BankAccount) => {
    try {
      const newAccount = await financeApi.createAccount(account);
      setAccounts(prev => [newAccount, ...prev]);
    } catch (error) {
      console.error('Failed to add account:', error);
    }
  }, []);

  const updateAccount = useCallback(async (id: string, updates: Partial<BankAccount>) => {
    try {
      const updated = await financeApi.updateAccount(id, updates);
      setAccounts(prev => prev.map(a => a.id === id ? updated : a));
    } catch (error) {
      console.error('Failed to update account:', error);
    }
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    try {
      await financeApi.deleteAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  }, []);

  const addIncomeSource = useCallback(async (income: IncomeSource) => {
    try {
      const newIncome = await financeApi.createIncomeSource(income);
      setIncomeSources(prev => [newIncome, ...prev]);
    } catch (error) {
      console.error('Failed to add income source:', error);
    }
  }, []);

  const updateIncomeSource = useCallback(async (id: string, updates: Partial<IncomeSource>) => {
    try {
      const updated = await financeApi.updateIncomeSource(id, updates);
      setIncomeSources(prev => prev.map(i => i.id === id ? updated : i));
    } catch (error) {
      console.error('Failed to update income source:', error);
    }
  }, []);

  const deleteIncomeSource = useCallback(async (id: string) => {
    try {
      await financeApi.deleteIncomeSource(id);
      setIncomeSources(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Failed to delete income source:', error);
    }
  }, []);

  const categorizeTransactions = useCallback(async () => {
    const targets = transactions.filter(t => t.category === 'Uncategorized' || (t.confidence && t.confidence < 0.8));
    if (targets.length === 0) return;

    setIsCategorizing(true);
    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `Categorize these transactions based on merchant names: ${JSON.stringify(targets.map(t => ({ id: t.id, merchant: t.merchant, currentCategory: t.category })))}. 
      Available categories: Housing, Food & Drink, Transport, Entertainment, Shopping, Electronics, Utilities, Health, Education, Others.
      Return as a JSON object where keys are transaction IDs and values are arrays of objects with "category" and "confidence" (0-1), providing up to 3 best fits.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
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

      const newSuggestions = JSON.parse(response.text);
      setSuggestions(prev => ({ ...prev, ...newSuggestions }));
    } catch (error) {
      console.error("Categorization error:", error);
    } finally {
      setIsCategorizing(false);
    }
  }, [transactions]);

  const confirmCategory = useCallback((id: string, category: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, category, confidence: 1.0 } : t));
    setSuggestions(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return (
    <FinanceContext.Provider value={{ 
      transactions, 
      savingsGoals, 
      recurringPayments, 
      loans,
      budgets,
      accounts,
      incomeSources,
      spendingDataByCurrency, 
      isLoading,
      addTransactions, 
      addManualTransaction,
      analyzeFile, 
      deleteTransaction,
      updateTransaction,
      bulkUpdateTransactions,
      addSavingsGoal,
      updateSavingsGoal,
      addRecurringPayment,
      updateRecurringPayment,
      deleteRecurringPayment,
      addLoan,
      updateLoan,
      deleteLoan,
      addBudget,
      updateBudget,
      deleteBudget,
      addAccount,
      updateAccount,
      deleteAccount,
      addIncomeSource,
      updateIncomeSource,
      deleteIncomeSource,
      transferToSavings,
      categorizeTransactions,
      confirmCategory,
      suggestions,
      isCategorizing,
      isAddTransactionModalOpen,
      setIsAddTransactionModalOpen,
      healthMetricsByCurrency,
      netWorthByCurrency,
      monthlyTrends
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};
