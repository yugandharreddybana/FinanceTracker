import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Transaction, SavingsGoal, RecurringPayment, Loan, Budget, BankAccount, IncomeSource, UserProfile, Investment, AuditLog, FamilyAccount, CarbonEntry, TaxReport, ForecastResult } from '../types';
import { financeApi, familyApi, auditApi, MIDDLEWARE_BASE } from '../services/api';
import { safeStorage, isJwtExpired } from '../lib/utils';

interface FinanceContextType {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  recurringPayments: RecurringPayment[];
  loans: Loan[];
  budgets: Budget[];
  accounts: BankAccount[];
  incomeSources: IncomeSource[];
  investments: Investment[];
  auditLogs: AuditLog[];
  familyAccount: FamilyAccount | null;
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  clearDataForNewUser: () => void;
  refreshData: () => Promise<void>;
  spendingDataByCurrency: Record<string, { name: string; value: number; color: string }[]>;
  createFamily: (name: string) => void;
  joinFamily: (familyId: string) => void;
  deleteFamily: () => void;
  addFamilyMember: (name: string, role: string) => void;
  removeFamilyMember: (uid: string) => void;
  addLog: (action: string, details: string, entityType: string, entityId: string) => void;
  transferToSavings: (amount: number, goalId: string, accountId: string) => void;
  categorizeTransactions: () => Promise<void>;
  confirmCategory: (id: string, category: string) => void;
  suggestions: Record<string, { category: string; confidence: number }[]>;
  isCategorizing: boolean;
  isAddTransactionModalOpen: boolean;
  setIsAddTransactionModalOpen: (isOpen: boolean) => void;
  isOffline: boolean;
  netWorthByCurrency: Record<string, {
    total: number;
    assets: number;
    liabilities: number;
    change: number;
  }>;
  monthlyTrends: { month: string;[key: string]: number | string }[];
  healthMetricsByCurrency: Record<string, {
    savingsRate: number;
    debtRatio: number;
    emergencyFund: number;
    budgetAdherence: number;
    overallScore: number;
  }>;
  customCategories: { name: string; color: string; icon: string }[];
  addCategory: (category: { name: string; color: string; icon: string }) => void;
  deleteCategory: (name: string) => void;
  isLoading: boolean;
  addTransactions: (input: string | any[]) => Promise<void>;
  previewSmartAdd: (input: string) => Promise<any[]>;
  addManualTransaction: (tx: Transaction) => void;
  analyzeFile: (file: File, type: 'bill' | 'statement') => Promise<void>;
  deleteTransaction: (id: string) => void;
  bulkDeleteTransactions: (ids: string[]) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  bulkUpdateTransactions: (ids: string[], updates: Partial<Transaction>) => void;
  addSavingsGoal: (goal: SavingsGoal) => void;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;
  addRecurringPayment: (payment: RecurringPayment) => void;
  updateRecurringPayment: (id: string, updates: Partial<RecurringPayment>) => void;
  deleteRecurringPayment: (id: string) => void;
  addLoan: (loan: Loan) => void;
  updateLoan: (id: string, updates: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  addAccount: (account: BankAccount) => void;
  updateAccount: (id: string, updates: Partial<BankAccount>) => void;
  deleteAccount: (id: string) => void;
  addIncomeSource: (source: IncomeSource) => void;
  updateIncomeSource: (id: string, updates: Partial<IncomeSource>) => void;
  deleteIncomeSource: (id: string) => void;
  addInvestment: (investment: Investment) => void;
  updateInvestment: (id: string, updates: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;
  // Carbon footprint
  carbonEntries: CarbonEntry[];
  addCarbonEntry: (entry: CarbonEntry) => void;
  updateCarbonEntry: (id: string, updates: Partial<CarbonEntry>) => void;
  deleteCarbonEntry: (id: string) => void;
  // Tax reports
  taxReports: TaxReport[];
  addTaxReport: (report: TaxReport) => void;
  deleteTaxReport: (id: string) => void;
  // Forecasts
  forecasts: ForecastResult[];
  addForecast: (forecast: ForecastResult) => void;
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
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [familyAccount, setFamilyAccount] = useState<FamilyAccount | null>(null);
  const [carbonEntries, setCarbonEntries] = useState<CarbonEntry[]>([]);
  const [taxReports, setTaxReports] = useState<TaxReport[]>([]);
  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Guest User',
    email: 'guest@example.com',
    role: 'Member',
    preferences: {
      theme: 'dark',
      currency: 'INR',
      language: 'English (US)',
      notifications: true
    }
  });

  const clearDataForNewUser = useCallback(() => {
    setTransactions([]);
    setSavingsGoals([]);
    setRecurringPayments([]);
    setLoans([]);
    setBudgets([]);
    setAccounts([]);
    setIncomeSources([]);
    setInvestments([]);
    setAuditLogs([]);
    setFamilyAccount(null);
    setCarbonEntries([]);
    setTaxReports([]);
    setForecasts([]);
  }, []);

  // Dispatch a toast error event so App.tsx can surface it in the notification bell
  const dispatchToastError = (error: any) => {
    const message = error?.message || String(error);
    window.dispatchEvent(new CustomEvent('finance-toast-error', { detail: { message } }));
  };

  const [suggestions, setSuggestions] = useState<Record<string, { category: string; confidence: number }[]>>({});
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [customCategories, setCustomCategories] = useState<{ name: string; color: string; icon: string }[]>([
    { name: 'Housing', color: '#7C6EFA', icon: '🏠' },
    { name: 'Food & Drink', color: '#22D3A5', icon: '🍱' },
    { name: 'Transport', color: '#F43F5E', icon: '🚗' },
    { name: 'Entertainment', color: '#F59E0B', icon: '🎬' },
    { name: 'Shopping', color: '#8E9299', icon: '🛍️' },
    { name: 'Electronics', color: '#3B82F6', icon: '💻' },
    { name: 'Utilities', color: '#10B981', icon: '⚡' },
    { name: 'Health', color: '#EF4444', icon: '🏥' },
    { name: 'Education', color: '#6366F1', icon: '🎓' },
  ]);

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persistence — load when email changes (B2: runs after login, not just mount)
  // Persistence — read once on mount.
  useEffect(() => {
    if (userProfile.email === 'guest@example.com') return;
    const storageKey = `yugi_finance_data_${userProfile.email}`;
    const savedData = safeStorage.get(storageKey);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.savingsGoals) setSavingsGoals(parsed.savingsGoals);
        if (parsed.recurringPayments) setRecurringPayments(parsed.recurringPayments);
        if (parsed.loans) setLoans(parsed.loans);
        if (parsed.budgets) setBudgets(parsed.budgets);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.incomeSources) setIncomeSources(parsed.incomeSources);
        if (parsed.investments) setInvestments(parsed.investments);
        if (parsed.userProfile) setUserProfile(parsed.userProfile);
        if (parsed.customCategories) setCustomCategories(parsed.customCategories);
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
      } catch {
        /* corrupted blob — ignore and rehydrate from server */
      }
    }
    // Load carbon, tax, forecasts from user-specific keys
    const carbonKey = `yugi_finance_carbon_${userProfile.email}`;
    const taxKey = `yugi_finance_tax_${userProfile.email}`;
    const forecastKey = `yugi_finance_forecasts_${userProfile.email}`;
    try {
      const savedCarbon = localStorage.getItem(carbonKey);
      if (savedCarbon) setCarbonEntries(JSON.parse(savedCarbon));
      const savedTax = localStorage.getItem(taxKey);
      if (savedTax) setTaxReports(JSON.parse(savedTax));
      const savedForecasts = localStorage.getItem(forecastKey);
      if (savedForecasts) setForecasts(JSON.parse(savedForecasts));
    } catch (e) {
      console.error('Failed to load carbon/tax/forecast data:', e);
    }
    setIsDataLoaded(true);
  }, [userProfile.email]);

  // Debounced persist — runs at most every 750ms after the latest mutation.
  useEffect(() => {
    if (!isDataLoaded) return;
    const handle = window.setTimeout(() => {
      const dataToSave = {
        transactions, savingsGoals, recurringPayments, loans, budgets,
        accounts, incomeSources, investments, userProfile, customCategories, auditLogs
      };
      const storageKey = `yugi_finance_data_${userProfile.email}`;
      safeStorage.set(storageKey, JSON.stringify(dataToSave));
    }, 750);
    return () => window.clearTimeout(handle);
  }, [transactions, savingsGoals, recurringPayments, loans, budgets, accounts, incomeSources, investments, userProfile, customCategories, auditLogs, isDataLoaded]);

  const [isLoading, setIsLoading] = useState(false);

  // Refs to track latest state for sync-back logic without causing infinite loops
  const transactionsRef = useRef(transactions);
  const savingsGoalsRef = useRef(savingsGoals);
  const recurringPaymentsRef = useRef(recurringPayments);
  const loansRef = useRef(loans);
  const budgetsRef = useRef(budgets);
  const accountsRef = useRef(accounts);
  const incomeSourcesRef = useRef(incomeSources);
  const investmentsRef = useRef(investments);

  useEffect(() => {
    transactionsRef.current = transactions;
    savingsGoalsRef.current = savingsGoals;
    recurringPaymentsRef.current = recurringPayments;
    loansRef.current = loans;
    budgetsRef.current = budgets;
    accountsRef.current = accounts;
    incomeSourcesRef.current = incomeSources;
    investmentsRef.current = investments;
  }, [transactions, savingsGoals, recurringPayments, loans, budgets, accounts, incomeSources, investments]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [txs, goals, recs, lns, bdgts, accs, incs, invs] = await Promise.all([
        financeApi.getTransactions(),
        financeApi.getSavingsGoals(),
        financeApi.getRecurringPayments(),
        financeApi.getLoans(),
        financeApi.getBudgets(),
        financeApi.getAccounts(),
        financeApi.getIncomeSources(),
        financeApi.getInvestments()
      ]);

      setTransactions(txs);
      setSavingsGoals(goals);
      setRecurringPayments(recs);
      setLoans(lns);
      setBudgets(bdgts);
      setAccounts(accs);
      setIncomeSources(incs);
      setInvestments(invs);

      // Detect primary account currency and update userProfile default if still on INR
      const loaded = accs.length > 0 ? accs : accountsRef.current;
      if (loaded[0]?.currency && loaded[0].currency !== 'INR') {
        setUserProfile(p => p.preferences.currency === 'INR'
          ? { ...p, preferences: { ...p.preferences, currency: loaded[0].currency } }
          : p);
      }

      // Fetch audit logs from backend and merge with local (dedup by id)
      try {
        const backendLogs = await auditApi.getAuditLogs();
        if (backendLogs.length > 0) {
          setAuditLogs(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const newLogs = backendLogs.filter((l: AuditLog) => !existingIds.has(l.id));
            return [...prev, ...newLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          });
        }
      } catch {
        // Audit log sync is non-critical
      }

    } catch (error: any) {
      // B11: silently handle 401 — user is simply not logged in
      if (!error.message?.includes('401') && !error.message?.includes('Unauthorized')) {
        console.error('Failed to fetch/sync data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // State setters are stable; no external deps needed

  // B1: Trigger a data refresh whenever the logged-in user changes
  useEffect(() => {
    if (userProfile.email !== 'guest@example.com') {
      refreshData();
    }
  }, [userProfile.email]);



  const addLog = useCallback((action: string, details: string, entityType: string, entityId: string) => {
    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: userProfile.email,
      userName: userProfile.name,
      action,
      details,
      entityType,
      entityId
    };
    setAuditLogs(prev => [newLog, ...prev]);
    // Fire-and-forget: persist log to backend
    auditApi.syncAuditLogs([newLog]).catch(() => { });
  }, [userProfile.name, userProfile.email]);

  const addInvestment = useCallback(async (investment: Investment) => {
    const snapshot = investmentsRef.current;
    setInvestments(prev => [...prev, { ...investment, id: investment.id || crypto.randomUUID() }]);
    try {
      const newInv = await financeApi.createInvestment(investment);
      setInvestments(prev => prev.map(i => i.id === investment.id ? newInv : i));
      addLog('CREATE', `Added investment ${newInv.symbol}`, 'Investment', newInv.id);
    } catch (error) {
      setInvestments(snapshot);
      console.error('Failed to add investment:', error);
      dispatchToastError(error);
    }
  }, [addLog]);

  const updateInvestment = useCallback(async (id: string, updates: Partial<Investment>) => {
    const snapshot = investmentsRef.current;
    setInvestments(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
    try {
      const updated = await financeApi.updateInvestment(id, updates);
      setInvestments(prev => prev.map(inv => inv.id === id ? updated : inv));
      addLog('UPDATE', `Updated investment ${id}`, 'Investment', id);
    } catch (error) {
      setInvestments(snapshot);
      console.error('Failed to update investment:', error);
      dispatchToastError(error);
    }
  }, [addLog]);

  const deleteInvestment = useCallback(async (id: string) => {
    const snapshot = investmentsRef.current;
    setInvestments(prev => prev.filter(inv => inv.id !== id));
    try {
      await financeApi.deleteInvestment(id);
      addLog('DELETE', `Deleted investment ${id}`, 'Investment', id);
    } catch (error) {
      setInvestments(snapshot);
      console.error('Failed to delete investment:', error);
      dispatchToastError(error);
    }
  }, [addLog]);

  const createFamily = useCallback(async (name: string) => {
    try {
      const newFamily = await familyApi.createFamily(name, userProfile.name);
      setFamilyAccount(newFamily);
      setUserProfile(prev => ({ ...prev, familyId: newFamily.id }));
      addLog('CREATE', `Created family ${name}`, 'Family', newFamily.id);
    } catch (error) {
      console.error('Failed to create family:', error);
      dispatchToastError(error);
    }
  }, [userProfile.name, addLog]);

  const joinFamily = useCallback(async (familyId: string) => {
    try {
      const family = await familyApi.getFamily(familyId);
      setFamilyAccount(family);
      setUserProfile(prev => ({ ...prev, familyId }));
      addLog('JOIN', `Joined family ${familyId}`, 'Family', familyId);
    } catch (error) {
      console.error('Failed to join family:', error);
      dispatchToastError(error);
    }
  }, [addLog]);

  const deleteFamily = useCallback(async () => {
    if (familyAccount) {
      try {
        await familyApi.deleteFamily(familyAccount.id);
      } catch {
        // Best-effort backend deletion
      }
      addLog('DELETE', `Deleted family ${familyAccount.name}`, 'Family', familyAccount.id);
      setFamilyAccount(null);
      setUserProfile(prev => ({ ...prev, familyId: undefined }));
    }
  }, [familyAccount, addLog]);

  const addFamilyMember = useCallback(async (name: string, role: string) => {
    if (familyAccount) {
      try {
        const updatedFamily = await familyApi.addFamilyMember(familyAccount.id, name, role);
        setFamilyAccount(updatedFamily);
        addLog('UPDATE', `Added member ${name} to family`, 'Family', familyAccount.id);
      } catch (error) {
        console.error('Failed to add family member:', error);
        dispatchToastError(error);
      }
    }
  }, [familyAccount, addLog]);

  const removeFamilyMember = useCallback(async (uid: string) => {
    if (familyAccount) {
      try {
        const updatedFamily = await familyApi.removeFamilyMember(familyAccount.id, uid);
        setFamilyAccount(updatedFamily);
        addLog('UPDATE', `Removed member ${uid} from family`, 'Family', familyAccount.id);
      } catch (error) {
        console.error('Failed to remove family member:', error);
        dispatchToastError(error);
      }
    }
  }, [familyAccount, addLog]);

  const netWorthByCurrency = React.useMemo(() => {
    const result: Record<string, { total: number; assets: number; liabilities: number; change: number }> = {};

    // Net worth only includes bank accounts and loans - NOT investments
    const currencies = Array.from(new Set([
      ...accounts.map(a => a.currency || 'INR'),
      ...loans.map(l => l.currency || 'INR')
    ]));

    currencies.forEach(c => {
      result[c] = { total: 0, assets: 0, liabilities: 0, change: 0 };
    });

    accounts.forEach(a => {
      const curr = a.currency || 'INR';
      if (a.type !== 'Credit') {
        result[curr].assets += a.balance;
        result[curr].total += a.balance;
      } else {
        result[curr].liabilities += a.balance;
        result[curr].total -= a.balance;
      }
    });

    // Investments are NOT included in net worth per user requirement

    loans.forEach(l => {
      const curr = l.currency || 'INR';
      result[curr].liabilities += l.remainingAmount;
      result[curr].total -= l.remainingAmount;
    });

    // Calculate actual change based on income vs expenses this month
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthlyIncome = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear && t.type === 'income';
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const monthlyExpenses = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear && t.type === 'expense';
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    Object.keys(result).forEach(c => {
      const total = result[c].total;
      const base = Math.abs(total);
      result[c].change = base > 0 ? parseFloat(((monthlyIncome - monthlyExpenses) / base * 100).toFixed(1)) : 0;
    });

    return result;
  }, [accounts, loans, transactions]);

  const monthlyTrends = React.useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return {
        label: d.toLocaleString('default', { month: 'short' }),
        month: d.getMonth(),   // numeric month index (0–11)
        year: d.getFullYear()  // full year
      };
    }).reverse();

    return last6Months.map(m => {
      const monthData: { month: string;[key: string]: number | string } = { month: m.label };

      const currencies = Array.from(new Set(transactions.map(t => t.currency || 'INR')));
      currencies.forEach(curr => {
        const tDate = (t: Transaction) => new Date(t.date);
        const expense = transactions
          .filter(t => {
            const d = tDate(t);
            return d.getMonth() === m.month
              && d.getFullYear() === m.year
              && t.type === 'expense'
              && (t.currency || 'INR') === curr;
          })
          .reduce((acc, t) => acc + Math.abs(t.amount), 0);

        const income = transactions
          .filter(t => {
            const d = tDate(t);
            return d.getMonth() === m.month
              && d.getFullYear() === m.year
              && t.type === 'income'
              && (t.currency || 'INR') === curr;
          })
          .reduce((acc, t) => acc + Math.abs(t.amount), 0);

        monthData[`${curr}_expense`] = expense;
        monthData[`${curr}_income`] = income;
        monthData[curr] = expense; // keep backward compat
      });

      return monthData;
    });
  }, [transactions]);

  const healthMetricsByCurrency = React.useMemo(() => {
    const result: Record<string, { savingsRate: number; debtRatio: number; emergencyFund: number; budgetAdherence: number; overallScore: number }> = {};

    const currencies = Array.from(new Set(transactions.map(t => t.currency || 'INR')));

    // L1: Use current month only for income/expenses
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    currencies.forEach(curr => {
      const currBudgets = budgets.filter(b => (b.currency || 'INR') === curr);
      const totalBudget = currBudgets.reduce((acc, b) => acc + b.limit, 0);
      const totalSpent = currBudgets.reduce((acc, b) => acc + b.spent, 0);
      const budgetAdherence = totalBudget > 0 ? Math.max(0, 1 - (totalSpent / totalBudget)) : 1;

      const monthlyIncome = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'income' && (t.currency || 'INR') === curr && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).reduce((acc, t) => acc + t.amount, 0);

      const monthlyExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && (t.currency || 'INR') === curr && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).reduce((acc, t) => acc + Math.abs(t.amount), 0);

      const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;

      const nw = netWorthByCurrency[curr] || { assets: 0, liabilities: 0 };
      const debtRatio = nw.assets > 0 ? nw.liabilities / nw.assets : 0;

      // L2: Emergency fund uses 6-month average expenses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const last6MonthsExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && (t.currency || 'INR') === curr && d >= sixMonthsAgo;
      }).reduce((acc, t) => acc + Math.abs(t.amount), 0);
      const avgMonthlyExpenses = last6MonthsExpenses / 6;
      const emergencyFund = avgMonthlyExpenses > 0 ? nw.assets / avgMonthlyExpenses : 0;
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

  // L4: Auto-recalculate budget spent when transactions change
  useEffect(() => {
    if (budgets.length === 0 || transactions.length === 0) return;
    const now = new Date();
    setBudgets(prev => prev.map(budget => {
      const spent = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense'
          && t.category === budget.category
          && d.getMonth() === now.getMonth()
          && d.getFullYear() === now.getFullYear();
      }).reduce((acc, t) => acc + Math.abs(t.amount), 0);
      return { ...budget, spent };
    }));
  }, [transactions]); // only depend on transactions to avoid infinite loop

  // Sync transactions to server for MCP tools — relies on cookie, no localStorage needed
  React.useEffect(() => {
    if (userProfile.email === 'guest@example.com' || transactions.length === 0) return;

    fetch(`${MIDDLEWARE_BASE}/api/finance/sync-transactions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions })
    }).catch(err => console.error('Failed to sync transactions:', err));
  }, [transactions, userProfile.email]);


  const spendingDataByCurrency = React.useMemo(() => {
    const result: Record<string, { name: string, value: number, color: string }[]> = {};
    const currencies = Array.from(new Set(transactions.map(t => t.currency || 'INR')));

    currencies.forEach(curr => {
      const totals: Record<string, number> = {};
      transactions.forEach(t => {
        if (t.type === 'expense' && (t.currency || 'INR') === curr) {
          const cat = t.category || 'Uncategorized';
          totals[cat] = (totals[cat] || 0) + Math.abs(t.amount);
        }
      });
      result[curr] = Object.entries(totals).map(([name, value]) => ({
        name,
        value,
        color: customCategories.find(c => c.name === name)?.color || CATEGORY_COLORS[name] || '#6B7280'
      })).sort((a, b) => b.value - a.value);
    });

    return result;
  }, [transactions, customCategories]);

  const transferToSavings = useCallback(async (amount: number, goalId: string, accountId: string) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    const account = accounts.find(a => a.id === accountId);
    if (!goal || !account) return;

    // B5: Insufficient balance guard
    if (account.balance < amount) {
      const err = new Error(`Insufficient balance in ${account.name}. Available: ${account.balance}`);
      window.dispatchEvent(new CustomEvent('finance-toast-error', { detail: { message: err.message } }));
      throw err;
    }

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
      dispatchToastError(error);
    }
  }, [savingsGoals, accounts]);

  const guardAccounts = useCallback(() => {
    if (accounts.length === 0) {
      const e: any = new Error('No bank accounts exist. Add a bank account before logging transactions.');
      e.code = 'NO_ACCOUNTS';
      throw e;
    }
    if (!accounts.some(a => a.isPrimary)) {
      const e: any = new Error('No primary bank account is set. Mark one account as primary so we know where to file transactions.');
      e.code = 'NO_PRIMARY';
      throw e;
    }
  }, [accounts]);

  const previewSmartAdd = useCallback(async (input: string): Promise<any[]> => {
    guardAccounts();
    const acctCtx = accounts.map(a => ({
      id: a.id, name: a.name, bank: a.bank, currency: a.currency, isPrimary: a.isPrimary
    }));
    return financeApi.processAIInput(input, {
      savingsGoals: savingsGoals.map(g => ({ id: g.id, name: g.name })),
      accounts: acctCtx,
    });
  }, [accounts, savingsGoals, guardAccounts]);

  const addTransactions = useCallback(async (input: string | any[]) => {
    try {
      guardAccounts();

      const results = Array.isArray(input)
        ? input
        : await previewSmartAdd(input);

      const overallPrimary = accounts.find(a => a.isPrimary) || accounts[0];
      const findAccount = (needle?: string, ccy?: string) => {
        if (needle) {
          const n = needle.toLowerCase().trim();
          const byName =
            accounts.find(a => a.name.toLowerCase() === n) ||
            accounts.find(a => a.name.toLowerCase().includes(n) || n.includes(a.name.toLowerCase())) ||
            accounts.find(a => (a.bank || '').toLowerCase() === n) ||
            accounts.find(a => (a.bank || '').toLowerCase().includes(n) || n.includes((a.bank || '').toLowerCase()));
          if (byName) return byName;
        }
        if (ccy) {
          const C = ccy.toUpperCase();
          const primaryOfCcy = accounts.find(a => a.isPrimary && (a.currency || '').toUpperCase() === C);
          if (primaryOfCcy) return primaryOfCcy;
          const anyOfCcy = accounts.find(a => (a.currency || '').toUpperCase() === C);
          if (anyOfCcy) return anyOfCcy;
        }
        return overallPrimary;
      };

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
          const type: 'expense' | 'income' = res.type === 'income' || res.type === 'expense'
            ? res.type
            : (amount > 0 ? 'income' : 'expense');
          const matchedAccount = findAccount(res.account, res.currency);
          const accountName = matchedAccount?.name;
          const currency = res.currency || matchedAccount?.currency;

          const cat = (res.category || 'Uncategorized');
          const catLc = cat.toLowerCase();
          const merchantLc = (res.merchant || res.name || '').toLowerCase();
          const matchesBudget = budgets.some(b => (b.category || '').toLowerCase() === catLc);
          const matchesLoan = catLc.includes('loan') || /\bemi\b/.test(catLc) || /\bemi\b/.test(merchantLc) || loans.some(l => merchantLc.includes((l.name || '').toLowerCase()) && (l.name || '').length > 0);
          const matchesBill = recurringPayments.some(r => merchantLc.includes((r.name || '').toLowerCase()) && (r.name || '').length > 0);
          const matchesSavings = !!res.savingsGoalId || catLc.includes('saving');
          const aiTag = matchesLoan ? 'Loan EMI'
            : matchesSavings ? 'Savings'
              : matchesBill ? 'Bill'
                : matchesBudget ? 'Budget'
                  : 'Smart Added';

          const newTx = await financeApi.createTransaction({
            date: dateStr,
            merchant: res.merchant || res.name || 'Unknown',
            amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
            category: cat,
            type,
            status: 'confirmed',
            aiTag,
            account: accountName,
            confidence: res.confidence || 0.9,
            currency
          });

          setTransactions(prev => [newTx, ...prev]);
          setAccounts(prev => prev.map(acc => {
            if (matchedAccount && acc.id === matchedAccount.id) {
              return { ...acc, balance: acc.balance + newTx.amount };
            }
            return acc;
          }));
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
        } else if (res.intent === 'BUDGET') {
          const newBudget = await financeApi.createBudget({
            category: res.category || 'Others',
            limit: res.limit || res.amount || 500,
            spent: 0,
            period: 'Monthly'
          });
          setBudgets(prev => [newBudget, ...prev]);
        } else if (res.intent === 'LOAN_PAYMENT') {
          const amount = Math.abs(res.amount || 0);
          const loanId = res.loanId;
          const matchedLoan = loanId ? loans.find(l => l.id === loanId) : (loans[0] || null);
          if (matchedLoan && amount > 0) {
            const updatedLoan = await financeApi.updateLoan(matchedLoan.id, {
              remainingAmount: Math.max(0, matchedLoan.remainingAmount - amount)
            });
            setLoans(prev => prev.map(l => l.id === matchedLoan.id ? updatedLoan : l));
            addLog('UPDATE', `Paid ${amount} towards loan: ${matchedLoan.name}`, 'Loan', matchedLoan.id);
          }
        }
      }
    } catch (error) {
      console.error("Error parsing smart add:", error);
      throw error; // Surface to UI
    }

  }, [accounts, savingsGoals, budgets, loans, recurringPayments, transferToSavings, previewSmartAdd, guardAccounts]);

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
      if (accounts.length === 0) {
        const e: any = new Error('No bank accounts exist. Add a bank account before scanning files.');
        e.code = 'NO_ACCOUNTS';
        throw e;
      }
      if (!accounts.some(a => a.isPrimary)) {
        const e: any = new Error('No primary bank account is set. Mark one account as primary first.');
        e.code = 'NO_PRIMARY';
        throw e;
      }

      const acctCtx = accounts.map(a => ({
        id: a.id, name: a.name, bank: a.bank, currency: a.currency, isPrimary: a.isPrimary
      }));
      const results = await financeApi.analyzeAIFile(base64Data, file.type, type, acctCtx);

      const overallPrimary = accounts.find(a => a.isPrimary) || accounts[0];
      const findAccount = (needle?: string, ccy?: string) => {
        if (needle) {
          const n = needle.toLowerCase().trim();
          const byName =
            accounts.find(a => a.name.toLowerCase() === n) ||
            accounts.find(a => a.name.toLowerCase().includes(n) || n.includes(a.name.toLowerCase())) ||
            accounts.find(a => (a.bank || '').toLowerCase().includes(n));
          if (byName) return byName;
        }
        if (ccy) {
          const C = ccy.toUpperCase();
          const primaryOfCcy = accounts.find(a => a.isPrimary && (a.currency || '').toUpperCase() === C);
          if (primaryOfCcy) return primaryOfCcy;
          const anyOfCcy = accounts.find(a => (a.currency || '').toUpperCase() === C);
          if (anyOfCcy) return anyOfCcy;
        }
        return overallPrimary;
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const parsedTransactions: Transaction[] = [];
      const balanceDeltas: Record<string, number> = {};

      for (const res of results) {
        let dateStr = res.date;
        const matchedDate = new Date(res.date);
        if (isNaN(matchedDate.getTime()) || matchedDate > today) {
          dateStr = new Date().toISOString().split('T')[0];
        }

        const txType = (res.type === 'income' ? 'income' : 'expense') as 'expense' | 'income';
        const matchedAccount = findAccount(res.account, res.currency);
        const currency = res.currency || matchedAccount?.currency;
        const signed = txType === 'expense' ? -Math.abs(res.amount) : Math.abs(res.amount);

        const newTx = await financeApi.createTransaction({
          date: dateStr,
          merchant: res.merchant,
          amount: signed,
          category: res.category || 'Uncategorized',
          type: txType,
          status: 'confirmed',
          aiTag: type === 'bill' ? 'Bill Scanned' : 'Statement Uploaded',
          account: matchedAccount?.name,
          confidence: res.confidence || 0.95,
          currency
        });
        parsedTransactions.push(newTx);
        if (matchedAccount) {
          balanceDeltas[matchedAccount.id] = (balanceDeltas[matchedAccount.id] || 0) + signed;
        }
      }

      setTransactions(prev => [...parsedTransactions, ...prev]);
      setAccounts(prev => prev.map(acc =>
        balanceDeltas[acc.id] ? { ...acc, balance: acc.balance + balanceDeltas[acc.id] } : acc
      ));
    } catch (error) {
      console.error("Error analyzing file:", error);
      throw error;
    }
  }, [accounts]);

  const addManualTransaction = useCallback(async (transaction: Partial<Transaction>) => {
    if (!transaction.account) {
      const primaryAccount = accounts.find(acc => acc.isPrimary);
      if (primaryAccount) {
        transaction.account = primaryAccount.name;
      }
    }
    try {
      const newTx = await financeApi.createTransaction({
        ...transaction,
        status: transaction.status || 'confirmed',
        confidence: 1.0,
        aiTag: transaction.aiTag || 'Manual Entry'
      });
      setTransactions(prev => [newTx, ...prev]);

      // Update account balance
      if (newTx.account) {
        setAccounts(prev => prev.map(acc => {
          if (acc.name === newTx.account || acc.id === newTx.account) {
            return { ...acc, balance: acc.balance + newTx.amount };
          }
          return acc;
        }));
      }

      await refreshData();
      addLog('CREATE', `Added transaction: ${newTx.merchant}`, 'Transaction', newTx.id);
    } catch (error) {
      console.error('Failed to add manual transaction:', error);
      dispatchToastError(error);
      throw error;
    }
  }, [addLog, refreshData]);

  const deleteTransaction = useCallback(async (id: string) => {
    const snapshot = transactionsRef.current;
    const txToDelete = transactionsRef.current.find(t => t.id === id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    // Optimistically update account balance
    if (txToDelete && txToDelete.account) {
      setAccounts(prev => prev.map(acc => {
        if (acc.name === txToDelete.account || acc.id === txToDelete.account) {
          return { ...acc, balance: acc.balance - txToDelete.amount };
        }
        return acc;
      }));
    }
    try {
      await financeApi.deleteTransaction(id);
      await refreshData();
      addLog('DELETE', `Deleted transaction: ${txToDelete?.merchant || id}`, 'Transaction', id);
    } catch (error) {
      setTransactions(snapshot);
      // Revert account balance change on failure
      if (txToDelete && txToDelete.account) {
        setAccounts(prev => prev.map(acc => {
          if (acc.name === txToDelete.account || acc.id === txToDelete.account) {
            return { ...acc, balance: acc.balance + txToDelete.amount };
          }
          return acc;
        }));
      }
      console.error('Failed to delete transaction:', error);
      dispatchToastError(error);
    }
  }, [addLog, refreshData]);

  const bulkDeleteTransactions = useCallback(async (ids: string[]) => {
    try {
      const txsToDelete = transactionsRef.current.filter(t => ids.includes(t.id));
      // First call API to ensure it's deleted on server
      await financeApi.bulkDeleteTransactions(ids);

      // Update local state: transactions
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));

      // Update local state: account balances
      setAccounts(prevAccs => {
        let updatedAccs = [...prevAccs];
        txsToDelete.forEach(tx => {
          if (tx.account) {
            updatedAccs = updatedAccs.map(acc => {
              if (acc.name === tx.account || acc.id === tx.account) {
                return { ...acc, balance: acc.balance - tx.amount };
              }
              return acc;
            });
          }
        });
        return updatedAccs;
      });

      await refreshData();
      addLog('DELETE', `Bulk deleted ${ids.length} transactions`, 'Transaction', ids.join(','));
    } catch (error) {
      console.error('Failed to bulk delete transactions:', error);
      dispatchToastError(error);
    }
  }, [addLog]);

  const addSavingsGoal = useCallback(async (goal: SavingsGoal) => {
    const tempId = goal.id || crypto.randomUUID();
    const optimistic = { ...goal, id: tempId };
    setSavingsGoals(prev => [optimistic, ...prev]);
    try {
      const newGoal = await financeApi.createSavingsGoal(goal);
      setSavingsGoals(prev => prev.map(g => g.id === tempId ? newGoal : g));
      addLog('CREATE', `Added savings goal: ${newGoal.name}`, 'SavingsGoal', newGoal.id);
    } catch (error) {
      setSavingsGoals(prev => prev.filter(g => g.id !== tempId));
      console.error('Failed to add savings goal:', error);
      dispatchToastError(error);
    }
  }, []);

  const updateSavingsGoal = useCallback(async (id: string, updates: Partial<SavingsGoal>) => {
    const snapshot = savingsGoalsRef.current;
    setSavingsGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    try {
      const updated = await financeApi.updateSavingsGoal(id, updates);
      setSavingsGoals(prev => prev.map(g => g.id === id ? updated : g));
      addLog('UPDATE', `Updated savings goal: ${id}`, 'SavingsGoal', id);
    } catch (error) {
      setSavingsGoals(snapshot);
      console.error('Failed to update savings goal:', error);
      dispatchToastError(error);
    }
  }, []);

  const deleteSavingsGoal = useCallback(async (id: string) => {
    const snapshot = savingsGoalsRef.current;
    setSavingsGoals(prev => prev.filter(g => g.id !== id));
    try {
      await financeApi.deleteSavingsGoal(id);
      addLog('DELETE', `Deleted savings goal: ${id}`, 'SavingsGoal', id);
    } catch (error) {
      setSavingsGoals(snapshot);
      console.error('Failed to delete savings goal:', error);
      dispatchToastError(error);
    }
  }, []);

  const addRecurringPayment = useCallback(async (payment: RecurringPayment) => {
    try {
      const newPayment = await financeApi.createRecurringPayment(payment);
      setRecurringPayments(prev => [newPayment, ...prev]);
      addLog('CREATE', `Added recurring payment: ${newPayment.name}`, 'RecurringPayment', newPayment.id);
    } catch (error) {
      console.error('Failed to add recurring payment:', error);
      dispatchToastError(error);
    }
  }, []);

  const updateRecurringPayment = useCallback(async (id: string, updates: Partial<RecurringPayment>) => {
    try {
      const updated = await financeApi.updateRecurringPayment(id, updates);
      setRecurringPayments(prev => prev.map(p => p.id === id ? updated : p));
      addLog('UPDATE', `Updated recurring payment: ${id}`, 'RecurringPayment', id);
    } catch (error) {
      console.error('Failed to update recurring payment:', error);
      dispatchToastError(error);
    }
  }, []);

  const deleteRecurringPayment = useCallback(async (id: string) => {
    try {
      await financeApi.deleteRecurringPayment(id);
      setRecurringPayments(prev => prev.filter(p => p.id !== id));
      addLog('DELETE', `Deleted recurring payment: ${id}`, 'RecurringPayment', id);
    } catch (error) {
      console.error('Failed to delete recurring payment:', error);
      dispatchToastError(error);
    }
  }, []);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    const snapshot = transactionsRef.current;
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    try {
      const updated = await financeApi.updateTransaction(id, updates);
      setTransactions(prev => prev.map(t => t.id === id ? updated : t));
      addLog('UPDATE', `Updated transaction: ${id}`, 'Transaction', id);
    } catch (error) {
      setTransactions(snapshot);
      console.error('Failed to update transaction:', error);
      dispatchToastError(error);
    }
  }, []);

  const bulkUpdateTransactions = useCallback(async (ids: string[], updates: Partial<Transaction>) => {
    try {
      await financeApi.bulkUpdateTransactions(ids, updates);
      setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...updates } : t));
      addLog('UPDATE', `Bulk updated ${ids.length} transactions`, 'Transaction', ids.join(','));
    } catch (error) {
      console.error('Failed to bulk update transactions:', error);
      dispatchToastError(error);
    }
  }, []);

  const addLoan = useCallback(async (loan: Loan) => {
    const tempId = loan.id || crypto.randomUUID();
    const optimistic = { ...loan, id: tempId };
    setLoans(prev => [optimistic, ...prev]);
    try {
      const newLoan = await financeApi.createLoan(loan);
      setLoans(prev => prev.map(l => l.id === tempId ? newLoan : l));
      addLog('CREATE', `Added loan: ${newLoan.name}`, 'Loan', newLoan.id);
    } catch (error) {
      setLoans(prev => prev.filter(l => l.id !== tempId));
      console.error('Failed to add loan:', error);
      dispatchToastError(error);
    }
  }, []);

  const updateLoan = useCallback(async (id: string, updates: Partial<Loan>) => {
    const snapshot = loansRef.current;
    setLoans(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    try {
      const updated = await financeApi.updateLoan(id, updates);
      setLoans(prev => prev.map(l => l.id === id ? updated : l));
      addLog('UPDATE', `Updated loan: ${id}`, 'Loan', id);
    } catch (error) {
      setLoans(snapshot);
      console.error('Failed to update loan:', error);
      dispatchToastError(error);
    }
  }, []);

  const deleteLoan = useCallback(async (id: string) => {
    const snapshot = loansRef.current;
    setLoans(prev => prev.filter(l => l.id !== id));
    try {
      await financeApi.deleteLoan(id);
      addLog('DELETE', `Deleted loan: ${id}`, 'Loan', id);
    } catch (error) {
      setLoans(snapshot);
      console.error('Failed to delete loan:', error);
      dispatchToastError(error);
    }
  }, []);

  const addBudget = useCallback(async (budget: Budget) => {
    const tempId = budget.id || crypto.randomUUID();
    const optimistic = { ...budget, id: tempId };
    setBudgets(prev => [optimistic, ...prev]);
    try {
      const newBudget = await financeApi.createBudget(budget);
      setBudgets(prev => prev.map(b => b.id === tempId ? newBudget : b));
      addLog('CREATE', `Added budget: ${newBudget.category}`, 'Budget', newBudget.id);
    } catch (error) {
      setBudgets(prev => prev.filter(b => b.id !== tempId));
      console.error('Failed to add budget:', error);
      dispatchToastError(error);
    }
  }, []);

  const updateBudget = useCallback(async (id: string, updates: Partial<Budget>) => {
    const snapshot = budgetsRef.current;
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    try {
      const updated = await financeApi.updateBudget(id, updates);
      setBudgets(prev => prev.map(b => b.id === id ? updated : b));
      addLog('UPDATE', `Updated budget: ${id}`, 'Budget', id);
    } catch (error) {
      setBudgets(snapshot);
      console.error('Failed to update budget:', error);
      dispatchToastError(error);
    }
  }, []);

  const deleteBudget = useCallback(async (id: string) => {
    const snapshot = budgetsRef.current;
    setBudgets(prev => prev.filter(b => b.id !== id));
    try {
      await financeApi.deleteBudget(id);
      addLog('DELETE', `Deleted budget: ${id}`, 'Budget', id);
    } catch (error) {
      setBudgets(snapshot);
      console.error('Failed to delete budget:', error);
      dispatchToastError(error);
    }
  }, []);

  const addAccount = useCallback(async (account: BankAccount) => {
    const tempId = account.id || crypto.randomUUID();
    const optimistic = { ...account, id: tempId };
    setAccounts(prev => [optimistic, ...prev]);
    try {
      const newAccount = await financeApi.createAccount(account);
      setAccounts(prev => prev.map(a => a.id === tempId ? newAccount : a));
      addLog('CREATE', `Added account: ${newAccount.name}`, 'Account', newAccount.id);
    } catch (error) {
      setAccounts(prev => prev.filter(a => a.id !== tempId));
      console.error('Failed to add account:', error);
      dispatchToastError(error);
    }
  }, []);

  const updateAccount = useCallback(async (id: string, updates: Partial<BankAccount>) => {
    const snapshot = accountsRef.current;
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    try {
      const updated = await financeApi.updateAccount(id, updates);
      setAccounts(prev => prev.map(a => a.id === id ? updated : a));
      addLog('UPDATE', `Updated account: ${id}`, 'Account', id);
    } catch (error) {
      setAccounts(snapshot);
      console.error('Failed to update account:', error);
      dispatchToastError(error);
    }
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    const snapshot = accountsRef.current;
    setAccounts(prev => prev.filter(a => a.id !== id));
    try {
      await financeApi.deleteAccount(id);
      addLog('DELETE', `Deleted account: ${id}`, 'Account', id);
    } catch (error) {
      setAccounts(snapshot);
      console.error('Failed to delete account:', error);
      dispatchToastError(error);
    }
  }, []);

  const addIncomeSource = useCallback(async (income: IncomeSource) => {
    const tempId = income.id || crypto.randomUUID();
    const optimistic = { ...income, id: tempId };
    setIncomeSources(prev => [optimistic, ...prev]);
    try {
      const newIncome = await financeApi.createIncomeSource(income);
      setIncomeSources(prev => prev.map(i => i.id === tempId ? newIncome : i));
      addLog('CREATE', `Added income source: ${newIncome.source}`, 'IncomeSource', newIncome.id);
    } catch (error) {
      setIncomeSources(prev => prev.filter(i => i.id !== tempId));
      console.error('Failed to add income source:', error);
      dispatchToastError(error);
    }
  }, []);

  const updateIncomeSource = useCallback(async (id: string, updates: Partial<IncomeSource>) => {
    const snapshot = incomeSourcesRef.current;
    setIncomeSources(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    try {
      const updated = await financeApi.updateIncomeSource(id, updates);
      setIncomeSources(prev => prev.map(i => i.id === id ? updated : i));
      addLog('UPDATE', `Updated income source: ${id}`, 'IncomeSource', id);
    } catch (error) {
      setIncomeSources(snapshot);
      console.error('Failed to update income source:', error);
      dispatchToastError(error);
    }
  }, []);

  const deleteIncomeSource = useCallback(async (id: string) => {
    const snapshot = incomeSourcesRef.current;
    setIncomeSources(prev => prev.filter(i => i.id !== id));
    try {
      await financeApi.deleteIncomeSource(id);
      addLog('DELETE', `Deleted income source: ${id}`, 'IncomeSource', id);
    } catch (error) {
      setIncomeSources(snapshot);
      console.error('Failed to delete income source:', error);
      dispatchToastError(error);
    }
  }, []);

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile(prev => {
      const newUserProfile = {
        ...prev,
        ...updates,
        preferences: {
          ...prev.preferences,
          ...(updates.preferences || {})
        }
      };
      // A4: Only log meaningful profile changes, not preference tweaks
      const meaningfulUpdate = updates.name || updates.email || updates.role;
      if (meaningfulUpdate) {
        addLog('UPDATE', 'Updated user profile', 'UserProfile', 'user-1');
      }
      return newUserProfile;
    });
  }, [addLog]);

  const categorizeTransactions = useCallback(async () => {
    const targets = transactions.filter(t => t.category === 'Uncategorized' || (t.confidence && t.confidence < 0.8));
    if (targets.length === 0) return;

    setIsCategorizing(true);
    try {
      const newSuggestions = await financeApi.categorizeAI(targets.map(t => ({ id: t.id, merchant: t.merchant, amount: t.amount, currentCategory: t.category })));
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

  const addCategory = useCallback((category: { name: string; color: string; icon: string }) => {
    setCustomCategories(prev => [...prev, category]);
    addLog('CREATE', `Added category: ${category.name}`, 'Category', category.name);
  }, [addLog]);

  const deleteCategory = useCallback((name: string) => {
    setCustomCategories(prev => prev.filter(c => c.name !== name));
    // A8: Reassign transactions belonging to deleted category to 'Uncategorized'
    setTransactions(prev => prev.map(t => t.category === name ? { ...t, category: 'Uncategorized', confidence: 0.5 } : t));
    addLog('DELETE', `Deleted category: ${name}`, 'Category', name);
  }, [addLog]);

  // U4: Carbon footprint CRUD
  const addCarbonEntry = useCallback((entry: CarbonEntry) => {
    setCarbonEntries(prev => [entry, ...prev]);
  }, []);

  const updateCarbonEntry = useCallback((id: string, updates: Partial<CarbonEntry>) => {
    setCarbonEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteCarbonEntry = useCallback((id: string) => {
    setCarbonEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  // U5: Tax reports CRUD
  const addTaxReport = useCallback((report: TaxReport) => {
    setTaxReports(prev => [report, ...prev]);
  }, []);

  const deleteTaxReport = useCallback((id: string) => {
    setTaxReports(prev => prev.filter(r => r.id !== id));
  }, []);

  // U6: Forecast CRUD
  const addForecast = useCallback((forecast: ForecastResult) => {
    setForecasts(prev => [forecast, ...prev]);
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
      investments,
      auditLogs,
      familyAccount,
      userProfile,
      updateUserProfile,
      clearDataForNewUser,
      refreshData,
      spendingDataByCurrency,
      isLoading,
      addTransactions,
      previewSmartAdd,
      addManualTransaction,
      analyzeFile,
      deleteTransaction,
      bulkDeleteTransactions,
      updateTransaction,
      bulkUpdateTransactions,
      addSavingsGoal,
      updateSavingsGoal,
      deleteSavingsGoal,
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
      addInvestment,
      updateInvestment,
      deleteInvestment,
      createFamily,
      joinFamily,
      deleteFamily,
      addFamilyMember,
      removeFamilyMember,
      addLog,
      transferToSavings,
      categorizeTransactions,
      confirmCategory,
      suggestions,
      isCategorizing,
      isAddTransactionModalOpen,
      setIsAddTransactionModalOpen,
      isOffline,
      healthMetricsByCurrency,
      netWorthByCurrency,
      monthlyTrends,
      customCategories,
      addCategory,
      deleteCategory,
      carbonEntries,
      addCarbonEntry,
      updateCarbonEntry,
      deleteCarbonEntry,
      taxReports,
      addTaxReport,
      deleteTaxReport,
      forecasts,
      addForecast,
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
