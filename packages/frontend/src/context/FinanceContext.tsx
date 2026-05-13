import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from '../store';
import * as financeActions from '../store/financeSlice';
import { 
  Transaction, 
  SavingsGoal, 
  RecurringPayment, 
  Loan, 
  Budget, 
  BankAccount, 
  Category,
  IncomeSource, 
  UserProfile, 
  Investment, 
  AuditLog, 
  FamilyAccount, 
  CarbonEntry, 
  TaxReport, 
  ForecastResult 
} from '../types';
import { financeApi, familyApi, auditApi, authApi, MIDDLEWARE_BASE } from '../services/api';
import { safeStorage, sanitizeFinanceText } from '../lib/utils';
import { currencyService } from '../services/currencyService';

interface FinanceContextType {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  recurringPayments: RecurringPayment[];
  recurringTransactions: RecurringPayment[];
  loans: Loan[];
  budgets: Budget[];
  accounts: BankAccount[];
  bankAccounts: BankAccount[];
  categories: Category[];
  incomeSources: IncomeSource[];
  investments: Investment[];
  auditLogs: AuditLog[];
  familyAccount: FamilyAccount | null;
  userProfile: UserProfile;
  isLoggedIn: boolean;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearDataForNewUser: (email?: string) => void;
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
    income: number;
    expenses: number;
    change: number;
  }>;
  monthlyTrends: { month: string; [key: string]: number | string }[];
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
  /** True after the first finance API sync attempt finishes (success or failure). Demo/guest skips network but sets true immediately. */
  financeHydrated: boolean;
  /** Non-fatal refresh error (stale data may still be shown). */
  dataRefreshError: string | null;
  clearDataRefreshError: () => void;
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
  getTotalBalance: () => number;
  getMonthlyIncome: () => number;
  getMonthlyExpenses: () => number;
  getNetWorth: () => number;
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

const normalizeIncomeSource = (income: Partial<IncomeSource> & { date?: string }): IncomeSource => ({
  id: income.id || crypto.randomUUID(),
  source: income.source || '',
  amount: income.amount || 0,
  lastReceivedDate: income.lastReceivedDate || income.date || new Date().toISOString().split('T')[0],
  nextPaymentDate: income.nextPaymentDate,
  frequency: income.frequency || 'Monthly',
  color: income.color || '#7C6EFA',
  currency: income.currency,
});

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Provider store={store}>
      <FinanceProviderInner>
        {children}
      </FinanceProviderInner>
    </Provider>
  );
};

const FinanceProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();

  // Select states from Redux store
  const transactions = useSelector((state: RootState) => state.finance.transactions);
  const savingsGoals = useSelector((state: RootState) => state.finance.savingsGoals);
  const recurringPayments = useSelector((state: RootState) => state.finance.recurringPayments);
  const loans = useSelector((state: RootState) => state.finance.loans);
  const budgets = useSelector((state: RootState) => state.finance.budgets);
  const accounts = useSelector((state: RootState) => state.finance.accounts);
  const incomeSources = useSelector((state: RootState) => state.finance.incomeSources);
  const investments = useSelector((state: RootState) => state.finance.investments);
  const auditLogs = useSelector((state: RootState) => state.finance.auditLogs);
  const familyAccount = useSelector((state: RootState) => state.finance.familyAccount);
  const carbonEntries = useSelector((state: RootState) => state.finance.carbonEntries);
  const taxReports = useSelector((state: RootState) => state.finance.taxReports);
  const forecasts = useSelector((state: RootState) => state.finance.forecasts);
  const userProfile = useSelector((state: RootState) => state.finance.userProfile);
  const customCategories = useSelector((state: RootState) => state.finance.customCategories);
  const isOffline = useSelector((state: RootState) => state.finance.isOffline);
  const isLoading = useSelector((state: RootState) => state.finance.isLoading);
  const isDataLoaded = useSelector((state: RootState) => state.finance.isDataLoaded);

  const categories = (() => {
    const categoryMap = new Map<string, Category>();

    customCategories.forEach((category) => {
      categoryMap.set(category.name.toLowerCase(), {
        id: `custom-${category.name.toLowerCase()}`,
        name: category.name,
        icon: category.icon || '*',
        color: category.color || '#6B7280',
        type: 'expense',
      });
    });

    budgets.forEach((budget) => {
      const cat = budget.category || 'Uncategorized';
      const key = cat.toLowerCase();
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          id: `budget-${key}`,
          name: cat,
          icon: budget.emoji || '*',
          color: budget.color || CATEGORY_COLORS[cat] || '#6B7280',
          type: 'expense',
        });
      }
    });

    transactions.forEach((transaction) => {
      const cat = transaction.category || 'Uncategorized';
      const key = cat.toLowerCase();
      const existing = categoryMap.get(key);

      if (!existing) {
        categoryMap.set(key, {
          id: `transaction-${key}`,
          name: cat,
          icon: '*',
          color: CATEGORY_COLORS[cat] || '#6B7280',
          type: transaction.type,
        });
        return;
      }

      if (existing.type !== transaction.type) {
        categoryMap.set(key, {
          ...existing,
          type: transaction.type,
        });
      }
    });

    return Array.from(categoryMap.values());
  })();

  // Local React States
  const [suggestions, setSuggestions] = useState<Record<string, { category: string; confidence: number }[]>>({});
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dataRefreshError, setDataRefreshError] = useState<string | null>(null);
  const [financeHydrated, setFinanceHydrated] = useState(false);

  const clearDataRefreshError = useCallback(() => setDataRefreshError(null), []);

  useEffect(() => {
    if (!isLoggedIn) {
      setFinanceHydrated(false);
      setDataRefreshError(null);
    }
  }, [isLoggedIn]);

  // Refs to maintain latest states for async functions
  const transactionsRef = useRef(transactions);
  const savingsGoalsRef = useRef(savingsGoals);
  const recurringPaymentsRef = useRef(recurringPayments);
  const loansRef = useRef(loans);
  const budgetsRef = useRef(budgets);
  const accountsRef = useRef(accounts);
  const incomeSourcesRef = useRef(incomeSources);
  const investmentsRef = useRef(investments);
  const auditLogsRef = useRef(auditLogs);
  const familyAccountRef = useRef(familyAccount);
  const carbonEntriesRef = useRef(carbonEntries);
  const taxReportsRef = useRef(taxReports);
  const forecastsRef = useRef(forecasts);
  const userProfileRef = useRef(userProfile);
  const customCategoriesRef = useRef(customCategories);
  const isOfflineRef = useRef(isOffline);
  const isLoadingRef = useRef(isLoading);
  const isDataLoadedRef = useRef(isDataLoaded);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const transactionSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    transactionsRef.current = transactions;
    savingsGoalsRef.current = savingsGoals;
    recurringPaymentsRef.current = recurringPayments;
    loansRef.current = loans;
    budgetsRef.current = budgets;
    accountsRef.current = accounts;
    incomeSourcesRef.current = incomeSources;
    investmentsRef.current = investments;
    auditLogsRef.current = auditLogs;
    familyAccountRef.current = familyAccount;
    carbonEntriesRef.current = carbonEntries;
    taxReportsRef.current = taxReports;
    forecastsRef.current = forecasts;
    userProfileRef.current = userProfile;
    customCategoriesRef.current = customCategories;
    isOfflineRef.current = isOffline;
    isLoadingRef.current = isLoading;
    isDataLoadedRef.current = isDataLoaded;
  }, [
    transactions, savingsGoals, recurringPayments, loans, budgets, accounts, 
    incomeSources, investments, auditLogs, familyAccount, carbonEntries, 
    taxReports, forecasts, userProfile, customCategories, isOffline, isLoading, isDataLoaded
  ]);

  // Setters bridging Redux store
  const setTransactions = useCallback((p: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    dispatch(financeActions.setTransactions(typeof p === 'function' ? p(transactionsRef.current) : p));
  }, [dispatch]);
  
  const setSavingsGoals = useCallback((p: SavingsGoal[] | ((prev: SavingsGoal[]) => SavingsGoal[])) => {
    dispatch(financeActions.setSavingsGoals(typeof p === 'function' ? p(savingsGoalsRef.current) : p));
  }, [dispatch]);

  const setRecurringPayments = useCallback((p: RecurringPayment[] | ((prev: RecurringPayment[]) => RecurringPayment[])) => {
    dispatch(financeActions.setRecurringPayments(typeof p === 'function' ? p(recurringPaymentsRef.current) : p));
  }, [dispatch]);

  const setLoans = useCallback((p: Loan[] | ((prev: Loan[]) => Loan[])) => {
    dispatch(financeActions.setLoans(typeof p === 'function' ? p(loansRef.current) : p));
  }, [dispatch]);

  const setBudgets = useCallback((p: Budget[] | ((prev: Budget[]) => Budget[])) => {
    dispatch(financeActions.setBudgets(typeof p === 'function' ? p(budgetsRef.current) : p));
  }, [dispatch]);

  const setAccounts = useCallback((p: BankAccount[] | ((prev: BankAccount[]) => BankAccount[])) => {
    dispatch(financeActions.setAccounts(typeof p === 'function' ? p(accountsRef.current) : p));
  }, [dispatch]);

  const setIncomeSources = useCallback((p: IncomeSource[] | ((prev: IncomeSource[]) => IncomeSource[])) => {
    dispatch(financeActions.setIncomeSources(typeof p === 'function' ? p(incomeSourcesRef.current) : p));
  }, [dispatch]);

  const setInvestments = useCallback((p: Investment[] | ((prev: Investment[]) => Investment[])) => {
    dispatch(financeActions.setInvestments(typeof p === 'function' ? p(investmentsRef.current) : p));
  }, [dispatch]);

  const setAuditLogs = useCallback((p: AuditLog[] | ((prev: AuditLog[]) => AuditLog[])) => {
    dispatch(financeActions.setAuditLogs(typeof p === 'function' ? p(auditLogsRef.current) : p));
  }, [dispatch]);

  const setFamilyAccount = useCallback((p: FamilyAccount | null | ((prev: FamilyAccount | null) => FamilyAccount | null)) => {
    dispatch(financeActions.setFamilyAccount(typeof p === 'function' ? p(familyAccountRef.current) : p));
  }, [dispatch]);

  const getTotalBalance = useCallback(() => {
    return accounts.reduce((sum, account) => {
      return account.type === 'Credit' ? sum : sum + account.balance;
    }, 0);
  }, [accounts]);

  const getMonthlyIncome = useCallback(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return transactions.reduce((sum, transaction) => {
      if (transaction.type !== 'income' || !transaction.date.startsWith(currentMonth)) {
        return sum;
      }

      return sum + transaction.amount;
    }, 0);
  }, [transactions]);

  const getMonthlyExpenses = useCallback(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return transactions.reduce((sum, transaction) => {
      if (transaction.type !== 'expense' || !transaction.date.startsWith(currentMonth)) {
        return sum;
      }

      return sum + transaction.amount;
    }, 0);
  }, [transactions]);

  const getNetWorth = useCallback(() => {
    const pref = userProfile.preferences?.currency || 'INR';
    const buckets: Record<string, number> = {};

    accounts.forEach((account) => {
      const c = account.currency || 'INR';
      buckets[c] = buckets[c] ?? 0;
      if (account.type !== 'Credit') {
        buckets[c] += account.balance;
      } else {
        buckets[c] -= Math.abs(account.balance);
      }
    });

    loans.forEach((loan) => {
      const c = loan.currency || 'INR';
      buckets[c] = (buckets[c] ?? 0) - loan.remainingAmount;
    });

    investments.forEach((inv) => {
      const c = inv.currency || 'INR';
      buckets[c] = (buckets[c] ?? 0) + inv.quantity * inv.currentPrice;
    });

    return Object.entries(buckets).reduce(
      (sum, [ccy, value]) => sum + currencyService.convert(value, ccy, pref),
      0
    );
  }, [accounts, loans, investments, userProfile.preferences?.currency]);

  const setCarbonEntries = useCallback((p: CarbonEntry[] | ((prev: CarbonEntry[]) => CarbonEntry[])) => {
    dispatch(financeActions.setCarbonEntries(typeof p === 'function' ? p(carbonEntriesRef.current) : p));
  }, [dispatch]);

  const setTaxReports = useCallback((p: TaxReport[] | ((prev: TaxReport[]) => TaxReport[])) => {
    dispatch(financeActions.setTaxReports(typeof p === 'function' ? p(taxReportsRef.current) : p));
  }, [dispatch]);

  const setForecasts = useCallback((p: ForecastResult[] | ((prev: ForecastResult[]) => ForecastResult[])) => {
    dispatch(financeActions.setForecasts(typeof p === 'function' ? p(forecastsRef.current) : p));
  }, [dispatch]);

  const setUserProfile = useCallback((p: UserProfile | ((prev: UserProfile) => UserProfile)) => {
    dispatch(financeActions.setUserProfile(typeof p === 'function' ? p(userProfileRef.current) : p));
  }, [dispatch]);

  const setCustomCategories = useCallback((p: { name: string; color: string; icon: string }[] | ((prev: { name: string; color: string; icon: string }[]) => { name: string; color: string; icon: string }[])) => {
    dispatch(financeActions.setCustomCategories(typeof p === 'function' ? p(customCategoriesRef.current) : p));
  }, [dispatch]);

  const setIsOffline = useCallback((p: boolean | ((prev: boolean) => boolean)) => {
    dispatch(financeActions.setIsOffline(typeof p === 'function' ? p(isOfflineRef.current) : p));
  }, [dispatch]);

  const setIsLoading = useCallback((p: boolean | ((prev: boolean) => boolean)) => {
    dispatch(financeActions.setIsLoading(typeof p === 'function' ? p(isLoadingRef.current) : p));
  }, [dispatch]);

  const setIsDataLoaded = useCallback((p: boolean | ((prev: boolean) => boolean)) => {
    dispatch(financeActions.setIsDataLoaded(typeof p === 'function' ? p(isDataLoadedRef.current) : p));
  }, [dispatch]);

  const clearPersistedFinanceData = useCallback((email?: string) => {
    if (!email || email === financeActions.DEFAULT_USER_PROFILE.email) return;

    safeStorage.remove(`yugi_finance_data_${email}`);
    safeStorage.remove(`yugi_finance_carbon_${email}`);
    safeStorage.remove(`yugi_finance_tax_${email}`);
    safeStorage.remove(`yugi_finance_forecasts_${email}`);
    safeStorage.remove(`yugi_ai_chat_history_${email}`);
    safeStorage.remove(`ft_oracle_messages_${email}`);
  }, []);

  const clearDataForNewUser = useCallback((email?: string) => {
    clearPersistedFinanceData(email ?? userProfile.email);
    dispatch(financeActions.clearAllData());
  }, [clearPersistedFinanceData, userProfile.email, dispatch]);

  useEffect(() => {
    let isActive = true;

    authApi.me()
      .then((session) => {
        if (!isActive) {
          return;
        }

        const nextLoggedIn = Boolean(session?.user?.email);
        setIsLoggedIn(nextLoggedIn);

        if (session?.user?.email) {
          setUserProfile((prev) => ({
            ...prev,
            name: session.user.name || prev.name,
            email: session.user.email,
          }));
        }
      })
      .catch(() => {
        if (isActive) {
          setIsLoggedIn(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [setUserProfile]);

  useEffect(() => {
    const handleAuthExpired = () => setIsLoggedIn(false);

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    if (!userProfile.email || userProfile.email === financeActions.DEFAULT_USER_PROFILE.email) {
      setIsLoggedIn(false);
    }
  }, [userProfile.email]);

  const dispatchToastError = (error: any) => {
    const message = error?.message || String(error);
    window.dispatchEvent(new CustomEvent('finance-toast-error', { detail: { message } }));
  };

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
  }, [setIsOffline]);

  // Persistence — load when email changes
  useEffect(() => {
    if (userProfile.email === 'guest@example.com') return;
    const storageKey = `yugi_finance_data_${userProfile.email}`;
    const savedData = safeStorage.getItem(storageKey);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.userProfile?.preferences) {
          setUserProfile(prev => ({
            ...prev,
            preferences: parsed.userProfile.preferences,
          }));
        }
        if (parsed.customCategories) setCustomCategories(parsed.customCategories);
      } catch {
        safeStorage.remove(storageKey);
      }
    }
    setIsDataLoaded(true);
  }, [userProfile.email, setCustomCategories, setUserProfile, setIsDataLoaded]);

  // Debounced persist
  useEffect(() => {
    if (!isDataLoaded) return;
    const handle = window.setTimeout(() => {
      const dataToSave = {
        userProfile: {
          preferences: userProfile.preferences,
        },
        customCategories,
      };
      const storageKey = `yugi_finance_data_${userProfile.email}`;
      safeStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }, 750);
    return () => window.clearTimeout(handle);
  }, [customCategories, isDataLoaded, userProfile.email, userProfile.preferences]);

  const refreshData = useCallback(async () => {
    if (!userProfile.email || userProfile.email === 'guest@example.com') {
      setDataRefreshError(null);
      setFinanceHydrated(true);
      return;
    }
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }
    const run = (async () => {
      setIsLoading(true);
      setDataRefreshError(null);

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
        setIncomeSources(incs.map(normalizeIncomeSource));
        setInvestments(invs);

        const loaded = accs.length > 0 ? accs : accountsRef.current;
        if (loaded[0]?.currency && loaded[0].currency !== 'INR') {
          setUserProfile(p => p.preferences.currency === 'INR'
            ? { ...p, preferences: { ...p.preferences, currency: loaded[0].currency } }
            : p);
        }

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
        if (!error.message?.includes('401') && !error.message?.includes('Unauthorized')) {
          console.error('Failed to fetch/sync data:', error);
          setDataRefreshError(error?.message || 'Unable to refresh finance data from the server.');
        } else {
          setDataRefreshError(null);
        }
      } finally {
        setIsLoading(false);
        setFinanceHydrated(true);
      }
    })();

    refreshInFlightRef.current = run.finally(() => {
      refreshInFlightRef.current = null;
    });

    return refreshInFlightRef.current;
  }, [userProfile.email, setTransactions, setSavingsGoals, setRecurringPayments, setLoans, setBudgets, setAccounts, setIncomeSources, setInvestments, setAuditLogs, setUserProfile, setIsLoading]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const sessionUser = response?.user;

    setUserProfile((prev) => ({
      ...prev,
      name: sessionUser?.name || prev.name || email.split('@')[0],
      email: sessionUser?.email || email,
    }));
    setIsLoggedIn(true);

    return true;
  }, [setUserProfile]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const response = await authApi.register(name, email, password);
    const sessionUser = response?.user;

    setUserProfile((prev) => ({
      ...prev,
      name: sessionUser?.name || name,
      email: sessionUser?.email || email,
    }));
    setIsLoggedIn(true);

    return true;
  }, [setUserProfile]);

  const logout = useCallback(async () => {
    const email = userProfileRef.current.email;

    try {
      await authApi.logout();
    } finally {
      setIsLoggedIn(false);
      clearDataForNewUser(email);
    }
  }, [clearDataForNewUser]);

  useEffect(() => {
    if (userProfile.email !== 'guest@example.com') {
      refreshData();
    }
  }, [userProfile.email, refreshData]);

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
    if (userProfile.email && userProfile.email !== 'guest@example.com') {
      auditApi.syncAuditLogs([newLog]).catch(() => { });
    }
  }, [userProfile.name, userProfile.email, setAuditLogs]);

  const addInvestment = useCallback(async (investment: Investment) => {
    const snapshot = investmentsRef.current;
    setInvestments(prev => [...prev, { ...investment, id: investment.id || crypto.randomUUID() }]);
    try {
      const newInv = await financeApi.createInvestment(investment);
      setInvestments(prev => prev.map(i => i.id === investment.id ? newInv : i));
      addLog('CREATE', `Added investment ${newInv.symbol}`, 'Investment', newInv.id);
      await refreshData();
    } catch (error) {
      setInvestments(snapshot);
      console.error('Failed to add investment:', error);
      dispatchToastError(error);
    }
  }, [addLog, setInvestments, refreshData]);

  const updateInvestment = useCallback(async (id: string, updates: Partial<Investment>) => {
    const snapshot = investmentsRef.current;
    setInvestments(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv));
    try {
      const updated = await financeApi.updateInvestment(id, updates);
      setInvestments(prev => prev.map(inv => inv.id === id ? updated : inv));
      addLog('UPDATE', `Updated investment ${id}`, 'Investment', id);
      await refreshData();
    } catch (error) {
      setInvestments(snapshot);
      console.error('Failed to update investment:', error);
      dispatchToastError(error);
    }
  }, [addLog, setInvestments, refreshData]);

  const deleteInvestment = useCallback(async (id: string) => {
    const snapshot = investmentsRef.current;
    setInvestments(prev => prev.filter(inv => inv.id !== id));
    try {
      await financeApi.deleteInvestment(id);
      addLog('DELETE', `Deleted investment ${id}`, 'Investment', id);
      await refreshData();
    } catch (error) {
      setInvestments(snapshot);
      console.error('Failed to delete investment:', error);
      dispatchToastError(error);
    }
  }, [addLog, setInvestments, refreshData]);

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
  }, [userProfile.name, addLog, setFamilyAccount, setUserProfile]);

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
  }, [addLog, setFamilyAccount, setUserProfile]);

  const deleteFamily = useCallback(async () => {
    if (familyAccount) {
      try {
        await familyApi.deleteFamily(familyAccount.id);
      } catch {
        // Best-effort
      }
      addLog('DELETE', `Deleted family ${familyAccount.name}`, 'Family', familyAccount.id);
      setFamilyAccount(null);
      setUserProfile(prev => ({ ...prev, familyId: undefined }));
    }
  }, [familyAccount, addLog, setFamilyAccount, setUserProfile]);

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
  }, [familyAccount, addLog, setFamilyAccount]);

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
  }, [familyAccount, addLog, setFamilyAccount]);

  const netWorthByCurrency = React.useMemo(() => {
    const result: Record<string, { total: number; assets: number; liabilities: number; income: number; expenses: number; change: number }> = {};
    const allCurrencies = Array.from(new Set([
      ...accounts.map(a => a.currency || 'INR'),
      ...loans.map(l => l.currency || 'INR'),
      ...transactions.map(t => t.currency || 'INR'),
      ...investments.map(i => i.currency || 'INR'),
    ]));

    allCurrencies.forEach(c => {
      result[c] = { total: 0, assets: 0, liabilities: 0, income: 0, expenses: 0, change: 0 };
    });

    accounts.forEach(a => {
      const curr = a.currency || 'INR';
      if (a.type !== 'Credit') {
        result[curr].assets += a.balance;
        result[curr].total += a.balance;
      } else {
        result[curr].liabilities += Math.abs(a.balance);
        result[curr].total -= Math.abs(a.balance);
      }
    });

    loans.forEach(l => {
      const curr = l.currency || 'INR';
      result[curr].liabilities += l.remainingAmount;
      result[curr].total -= l.remainingAmount;
    });

    investments.forEach(inv => {
      const curr = inv.currency || 'INR';
      if (!result[curr]) {
        result[curr] = { total: 0, assets: 0, liabilities: 0, income: 0, expenses: 0, change: 0 };
      }
      const v = inv.quantity * inv.currentPrice;
      result[curr].assets += v;
      result[curr].total += v;
    });

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return;
      const curr = t.currency || 'INR';
      
      if (!result[curr]) {
        result[curr] = { total: 0, assets: 0, liabilities: 0, income: 0, expenses: 0, change: 0 };
      }

      if (t.type === 'income') {
        result[curr].income += Math.abs(t.amount);
      } else if (t.type === 'expense') {
        result[curr].expenses += Math.abs(t.amount);
      }
    });

    Object.keys(result).forEach(c => {
      const metrics = result[c];
      const base = Math.abs(metrics.total);
      metrics.change = base > 0 
        ? parseFloat(((metrics.income - metrics.expenses) / base * 100).toFixed(1)) 
        : 0;
    });

    return result;
  }, [accounts, loans, transactions, investments]);

  const monthlyTrends = React.useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return {
        label: d.toLocaleString('default', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear()
      };
    }).reverse();

    return last6Months.map(m => {
      const monthData: { month: string; [key: string]: number | string } = { month: m.label };
      const currencies: string[] = Array.from(new Set(transactions.map(t => t.currency || 'INR')));
      
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
        monthData[curr] = expense;
      });

      return monthData;
    });
  }, [transactions]);

  const healthMetricsByCurrency = React.useMemo(() => {
    const result: Record<string, { savingsRate: number; debtRatio: number; emergencyFund: number; budgetAdherence: number; overallScore: number }> = {};
    const currencies: string[] = Array.from(new Set(transactions.map(t => t.currency || 'INR')));
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

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const last6MonthsExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && (t.currency || 'INR') === curr && d >= sixMonthsAgo;
      }).reduce((acc, t) => acc + Math.abs(t.amount), 0);
      const avgMonthlyExpenses = last6MonthsExpenses / 6;
      const emergencyFund = avgMonthlyExpenses > 0 ? nw.assets / avgMonthlyExpenses : 0;
      const emergencyFundScore = Math.min(1, emergencyFund / 6);

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

  // Auto-recalculate budget spent when transactions change
  useEffect(() => {
    if (budgets.length === 0 || transactions.length === 0) return;
    const now = new Date();
    const updatedBudgets = budgets.map(budget => {
      const spent = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense'
          && t.category === budget.category
          && d.getMonth() === now.getMonth()
          && d.getFullYear() === now.getFullYear();
      }).reduce((acc, t) => acc + Math.abs(t.amount), 0);
      return { ...budget, spent };
    });
    
    // Simple check to prevent infinite loops: only dispatch if spent changed
    const anyChanged = budgets.some((b, i) => b.spent !== updatedBudgets[i].spent);
    if (anyChanged) {
      setBudgets(updatedBudgets);
    }
  }, [transactions, budgets, setBudgets]);

  // Sync transactions to server (debounced — avoids hammering the proxy on every keystroke)
  useEffect(() => {
    if (userProfile.email === 'guest@example.com' || transactions.length === 0) return;

    if (transactionSyncTimerRef.current) {
      clearTimeout(transactionSyncTimerRef.current);
    }
    transactionSyncTimerRef.current = setTimeout(() => {
      fetch(`${MIDDLEWARE_BASE}/api/finance/sync-transactions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions })
      }).catch(err => console.error('Failed to sync transactions:', err));
    }, 1600);

    return () => {
      if (transactionSyncTimerRef.current) {
        clearTimeout(transactionSyncTimerRef.current);
      }
    };
  }, [transactions, userProfile.email]);

  const spendingDataByCurrency = React.useMemo(() => {
    const result: Record<string, { name: string, value: number, color: string }[]> = {};
    const currencies: string[] = Array.from(new Set(transactions.map(t => t.currency || 'INR')));

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

    if (!Number.isFinite(amount) || amount <= 0) {
      const err = new Error('Transfer amount must be a positive number.');
      window.dispatchEvent(new CustomEvent('finance-toast-error', { detail: { message: err.message } }));
      throw err;
    }

    if (account.balance < amount) {
      const err = new Error(`Insufficient balance in ${account.name}. Available: ${account.balance}`);
      window.dispatchEvent(new CustomEvent('finance-toast-error', { detail: { message: err.message } }));
      throw err;
    }

    try {
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

      setTransactions(prev => [newTx, ...prev]);
      setSavingsGoals(prev => prev.map(g => g.id === goalId ? { ...g, current: g.current + Math.abs(amount) } : g));
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, balance: a.balance - Math.abs(amount) } : a));
      await refreshData();
    } catch (error) {
      console.error('Failed to transfer to savings:', error);
      dispatchToastError(error);
    }
  }, [savingsGoals, accounts, setTransactions, setSavingsGoals, setAccounts, refreshData]);

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

  const deleteTransaction = useCallback(async (id: string) => {
    const snapshot = transactionsRef.current;
    const txToDelete = transactionsRef.current.find(t => t.id === id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    
    if (txToDelete && txToDelete.account) {
      const amt = Math.abs(txToDelete.amount);
      const income = txToDelete.type === 'INCOME';
      const balanceDeltaOnRemove = income ? -amt : amt;
      setAccounts(prev => prev.map(acc => {
        if (acc.name === txToDelete.account || acc.id === txToDelete.account) {
          return { ...acc, balance: acc.balance + balanceDeltaOnRemove };
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
      if (txToDelete && txToDelete.account) {
        const amt = Math.abs(txToDelete.amount);
        const income = txToDelete.type === 'INCOME';
        const balanceDeltaOnRemove = income ? -amt : amt;
        setAccounts(prev => prev.map(acc => {
          if (acc.name === txToDelete.account || acc.id === txToDelete.account) {
            return { ...acc, balance: acc.balance - balanceDeltaOnRemove };
          }
          return acc;
        }));
      }
      console.error('Failed to delete transaction:', error);
      dispatchToastError(error);
    }
  }, [addLog, refreshData, setTransactions, setAccounts]);

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
      const defaultCurrency = overallPrimary?.currency || 'INR';

      for (const res of results) {
        try {
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

            let finalCat = cat;
            if (!matchesBudget) {
              const bestMatch = budgets.find(b => 
                b.category.toLowerCase().includes(merchantLc) || 
                merchantLc.includes(b.category.toLowerCase())
              );
              if (bestMatch) finalCat = bestMatch.category;
            }

            const createdTx = await financeApi.createTransaction({
              date: dateStr,
              merchant: sanitizeFinanceText(res.merchant || res.name || 'AI Logged Purchase'),
              amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
              category: sanitizeFinanceText(finalCat),
              type,
              status: 'confirmed',
              aiTag: 'Arta AI Autopilot',
              account: accountName,
              currency,
              confidence: res.confidence || 0.9
            });

            setTransactions(prev => [createdTx, ...prev]);

            if (matchedAccount) {
              setAccounts(prev => prev.map(a => a.id === matchedAccount.id ? { ...a, balance: a.balance + createdTx.amount } : a));
            }

          } else if (res.intent === 'SAVINGS_GOAL') {
            const goal = {
              id: `goal-${Date.now()}`,
              name: res.name || 'New Savings Goal',
              target: Number(res.target) || 0,
              current: 0,
              emoji: res.emoji || '🎯',
              deadline: res.deadline || 'No deadline',
              currency: res.currency || defaultCurrency,
              isHero: false,
            };
            await financeApi.createSavingsGoal(goal);
            addLog('CREATE', `AI created savings goal: ${goal.name}`, 'SavingsGoal', goal.id);

          } else if (res.intent === 'BUDGET') {
            const budget = {
              id: `budget-${Date.now()}`,
              category: res.category || 'Others',
              emoji: res.emoji || '📊',
              limit: Number(res.limit) || 0,
              spent: 0,
              color: res.color || '#7C6EFA',
              currency: res.currency || defaultCurrency,
            };
            await financeApi.createBudget(budget);
            addLog('CREATE', `AI created budget: ${budget.category}`, 'Budget', budget.id);

          } else if (res.intent === 'RECURRING_PAYMENT') {
            const payment = {
              id: `rec-${Date.now()}`,
              name: res.name || res.merchant || 'New Subscription',
              amount: Number(res.amount) || 0,
              date: Number(res.dayOfMonth) || 1,
              category: res.category || 'Entertainment',
              frequency: res.frequency || 'Monthly',
              status: 'Active' as const,
              currency: res.currency || defaultCurrency,
              description: res.description || '',
              paymentMethod: res.paymentMethod || '',
              history: [],
            };
            await financeApi.createRecurringPayment(payment);
            addLog('CREATE', `AI created recurring payment: ${payment.name}`, 'RecurringPayment', payment.id);

          } else if (res.intent === 'LOAN') {
            const startDate = res.startDate || new Date().toISOString().split('T')[0];
            const loan = {
              id: `loan-${Date.now()}`,
              name: res.name || 'New Loan',
              totalAmount: Number(res.totalAmount) || 0,
              remainingAmount: Number(res.totalAmount) || 0,
              monthlyEMI: Number(res.monthlyEMI) || 0,
              interestRate: Number(res.interestRate) || 0,
              tenureYears: Number(res.tenureYears) || 0,
              startDate,
              endDate: res.endDate || startDate,
              category: res.category || 'Personal Loan',
              color: '#3B82F6',
              currency: res.currency || defaultCurrency,
              payments: [],
            };
            await financeApi.createLoan(loan);
            addLog('CREATE', `AI created loan: ${loan.name}`, 'Loan', loan.id);

          } else if (res.intent === 'SAVINGS_TRANSFER') {
            const goalName = (res.goalName || '').toLowerCase();
            const goalId = res.goalId;
            const matchedGoal = savingsGoals.find(g => 
              g.id === goalId || 
              g.name.toLowerCase() === goalName ||
              g.name.toLowerCase().includes(goalName) ||
              goalName.includes(g.name.toLowerCase())
            );
            if (matchedGoal) {
              await financeApi.updateSavingsGoal(matchedGoal.id, {
                current: matchedGoal.current + Number(res.amount || 0)
              });
              addLog('UPDATE', `AI transferred ${res.amount} to goal: ${matchedGoal.name}`, 'SavingsGoal', matchedGoal.id);
            }

          } else if (res.intent === 'LOAN_PAYMENT') {
            const loanName = (res.loanName || '').toLowerCase();
            const matchedLoan = loans.find(l =>
              l.name.toLowerCase() === loanName ||
              l.name.toLowerCase().includes(loanName) ||
              loanName.includes(l.name.toLowerCase())
            );
            if (matchedLoan) {
              const paymentAmount = Number(res.amount) || matchedLoan.monthlyEMI;
              await financeApi.updateLoan(matchedLoan.id, {
                remainingAmount: Math.max(0, matchedLoan.remainingAmount - paymentAmount),
                payments: [...(matchedLoan.payments || []), {
                  date: new Date().toISOString().split('T')[0],
                  amount: paymentAmount,
                  principal: paymentAmount * 0.7,
                  interest: paymentAmount * 0.3,
                }]
              });
              addLog('UPDATE', `AI recorded loan payment of ${paymentAmount} for: ${matchedLoan.name}`, 'Loan', matchedLoan.id);
            }
          } else if (res.intent === 'DELETE_TRANSACTION') {
            const merchant = (res.merchant || '').toLowerCase();
            const amount = Math.abs(Number(res.amount) || 0);
            const matchedTx = transactions.find(t => 
              (t.merchant.toLowerCase() === merchant || t.merchant.toLowerCase().includes(merchant)) &&
              (amount === 0 || Math.abs(t.amount) === amount)
            );
            if (matchedTx) {
              await deleteTransaction(matchedTx.id);
            }
          }
        } catch (itemError) {
          console.error(`Failed to process AI item with intent ${res.intent}:`, itemError);
        }
      }

      await refreshData();
      addLog('CREATE', `Processed AI smart add input`, 'AIAutopilot', 'ai-1');
    } catch (error) {
      console.error('Failed to smart add transaction:', error);
      dispatchToastError(error);
    }
  }, [accounts, budgets, savingsGoals, loans, transactions, deleteTransaction, previewSmartAdd, refreshData, addLog, setTransactions, setAccounts, guardAccounts]);

  const addManualTransaction = useCallback(async (transaction: Transaction) => {
    try {
      const newTx = await financeApi.createTransaction({
        ...transaction,
        status: transaction.status || 'confirmed',
        confidence: 1.0,
        aiTag: transaction.aiTag || 'Manual Entry'
      });
      setTransactions(prev => [newTx, ...prev]);

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
  }, [addLog, refreshData, setTransactions, setAccounts]);

  const bulkDeleteTransactions = useCallback(async (ids: string[]) => {
    try {
      const txsToDelete = transactionsRef.current.filter(t => ids.includes(t.id));
      await financeApi.bulkDeleteTransactions(ids);

      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));

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
  }, [addLog, refreshData, setTransactions, setAccounts]);

  const addSavingsGoal = useCallback(async (goal: SavingsGoal) => {
    const tempId = goal.id || crypto.randomUUID();
    const optimistic = { ...goal, id: tempId };
    setSavingsGoals(prev => [optimistic, ...prev]);
    try {
      const newGoal = await financeApi.createSavingsGoal(goal);
      setSavingsGoals(prev => prev.map(g => g.id === tempId ? newGoal : g));
      addLog('CREATE', `Added savings goal: ${newGoal.name}`, 'SavingsGoal', newGoal.id);
      await refreshData();
    } catch (error) {
      setSavingsGoals(prev => prev.filter(g => g.id !== tempId));
      console.error('Failed to add savings goal:', error);
      dispatchToastError(error);
    }
  }, [addLog, setSavingsGoals, refreshData]);

  const updateSavingsGoal = useCallback(async (id: string, updates: Partial<SavingsGoal>) => {
    const snapshot = savingsGoalsRef.current;
    setSavingsGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    try {
      const updated = await financeApi.updateSavingsGoal(id, updates);
      setSavingsGoals(prev => prev.map(g => g.id === id ? updated : g));
      addLog('UPDATE', `Updated savings goal: ${id}`, 'SavingsGoal', id);
      await refreshData();
    } catch (error) {
      setSavingsGoals(snapshot);
      console.error('Failed to update savings goal:', error);
      dispatchToastError(error);
    }
  }, [addLog, setSavingsGoals, refreshData]);

  const deleteSavingsGoal = useCallback(async (id: string) => {
    const snapshot = savingsGoalsRef.current;
    setSavingsGoals(prev => prev.filter(g => g.id !== id));
    try {
      await financeApi.deleteSavingsGoal(id);
      addLog('DELETE', `Deleted savings goal: ${id}`, 'SavingsGoal', id);
      await refreshData();
    } catch (error) {
      setSavingsGoals(snapshot);
      console.error('Failed to delete savings goal:', error);
      dispatchToastError(error);
    }
  }, [addLog, setSavingsGoals, refreshData]);

  const addRecurringPayment = useCallback(async (payment: RecurringPayment) => {
    try {
      const newPayment = await financeApi.createRecurringPayment(payment);
      setRecurringPayments(prev => [newPayment, ...prev]);
      addLog('CREATE', `Added recurring payment: ${newPayment.name}`, 'RecurringPayment', newPayment.id);
      await refreshData();
    } catch (error) {
      console.error('Failed to add recurring payment:', error);
      dispatchToastError(error);
    }
  }, [addLog, setRecurringPayments, refreshData]);

  const updateRecurringPayment = useCallback(async (id: string, updates: Partial<RecurringPayment>) => {
    try {
      const updated = await financeApi.updateRecurringPayment(id, updates);
      setRecurringPayments(prev => prev.map(p => p.id === id ? updated : p));
      addLog('UPDATE', `Updated recurring payment: ${id}`, 'RecurringPayment', id);
      await refreshData();
    } catch (error) {
      console.error('Failed to update recurring payment:', error);
      dispatchToastError(error);
    }
  }, [addLog, setRecurringPayments, refreshData]);

  const deleteRecurringPayment = useCallback(async (id: string) => {
    try {
      await financeApi.deleteRecurringPayment(id);
      setRecurringPayments(prev => prev.filter(p => p.id !== id));
      addLog('DELETE', `Deleted recurring payment: ${id}`, 'RecurringPayment', id);
      await refreshData();
    } catch (error) {
      console.error('Failed to delete recurring payment:', error);
      dispatchToastError(error);
    }
  }, [addLog, setRecurringPayments, refreshData]);

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
  }, [addLog, setTransactions]);

  const bulkUpdateTransactions = useCallback(async (ids: string[], updates: Partial<Transaction>) => {
    try {
      await financeApi.bulkUpdateTransactions(ids, updates);
      setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...updates } : t));
      addLog('UPDATE', `Bulk updated ${ids.length} transactions`, 'Transaction', ids.join(','));
    } catch (error) {
      console.error('Failed to bulk update transactions:', error);
      dispatchToastError(error);
    }
  }, [addLog, setTransactions]);

  const addLoan = useCallback(async (loan: Loan) => {
    const tempId = loan.id || crypto.randomUUID();
    const optimistic = { ...loan, id: tempId };
    setLoans(prev => [optimistic, ...prev]);
    try {
      const newLoan = await financeApi.createLoan(loan);
      setLoans(prev => prev.map(l => l.id === tempId ? newLoan : l));
      addLog('CREATE', `Added loan: ${newLoan.name}`, 'Loan', newLoan.id);
      await refreshData();
    } catch (error) {
      setLoans(prev => prev.filter(l => l.id !== tempId));
      console.error('Failed to add loan:', error);
      dispatchToastError(error);
    }
  }, [addLog, setLoans, refreshData]);

  const updateLoan = useCallback(async (id: string, updates: Partial<Loan>) => {
    const snapshot = loansRef.current;
    setLoans(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    try {
      const updated = await financeApi.updateLoan(id, updates);
      setLoans(prev => prev.map(l => l.id === id ? updated : l));
      addLog('UPDATE', `Updated loan: ${id}`, 'Loan', id);
      await refreshData();
    } catch (error) {
      setLoans(snapshot);
      console.error('Failed to update loan:', error);
      dispatchToastError(error);
    }
  }, [addLog, setLoans, refreshData]);

  const deleteLoan = useCallback(async (id: string) => {
    const snapshot = loansRef.current;
    setLoans(prev => prev.filter(l => l.id !== id));
    try {
      await financeApi.deleteLoan(id);
      addLog('DELETE', `Deleted loan: ${id}`, 'Loan', id);
      await refreshData();
    } catch (error) {
      setLoans(snapshot);
      console.error('Failed to delete loan:', error);
      dispatchToastError(error);
    }
  }, [addLog, setLoans, refreshData]);

  const addBudget = useCallback(async (budget: Budget) => {
    const tempId = budget.id || crypto.randomUUID();
    const optimistic = { ...budget, id: tempId };
    setBudgets(prev => [optimistic, ...prev]);
    try {
      const newBudget = await financeApi.createBudget(budget);
      setBudgets(prev => prev.map(b => b.id === tempId ? newBudget : b));
      addLog('CREATE', `Added budget: ${newBudget.category}`, 'Budget', newBudget.id);
      await refreshData();
    } catch (error) {
      setBudgets(prev => prev.filter(b => b.id !== tempId));
      console.error('Failed to add budget:', error);
      dispatchToastError(error);
    }
  }, [addLog, setBudgets, refreshData]);

  const updateBudget = useCallback(async (id: string, updates: Partial<Budget>) => {
    const snapshot = budgetsRef.current;
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    try {
      const updated = await financeApi.updateBudget(id, updates);
      setBudgets(prev => prev.map(b => b.id === id ? updated : b));
      addLog('UPDATE', `Updated budget: ${id}`, 'Budget', id);
      await refreshData();
    } catch (error) {
      setBudgets(snapshot);
      console.error('Failed to update budget:', error);
      dispatchToastError(error);
    }
  }, [addLog, setBudgets, refreshData]);

  const deleteBudget = useCallback(async (id: string) => {
    const snapshot = budgetsRef.current;
    setBudgets(prev => prev.filter(b => b.id !== id));
    try {
      await financeApi.deleteBudget(id);
      addLog('DELETE', `Deleted budget: ${id}`, 'Budget', id);
      await refreshData();
    } catch (error) {
      setBudgets(snapshot);
      console.error('Failed to delete budget:', error);
      dispatchToastError(error);
    }
  }, [addLog, setBudgets, refreshData]);

  const addAccount = useCallback(async (account: BankAccount) => {
    const tempId = account.id || crypto.randomUUID();
    const optimistic = { ...account, id: tempId };
    setAccounts(prev => [optimistic, ...prev]);
    try {
      const newAccount = await financeApi.createAccount(account);
      setAccounts(prev => prev.map(a => a.id === tempId ? newAccount : a));
      addLog('CREATE', `Added account: ${newAccount.name}`, 'Account', newAccount.id);
      await refreshData();
    } catch (error) {
      setAccounts(prev => prev.filter(a => a.id !== tempId));
      console.error('Failed to add account:', error);
      dispatchToastError(error);
    }
  }, [addLog, setAccounts, refreshData]);

  const updateAccount = useCallback(async (id: string, updates: Partial<BankAccount>) => {
    const snapshot = accountsRef.current;
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    try {
      const updated = await financeApi.updateAccount(id, updates);
      setAccounts(prev => prev.map(a => a.id === id ? updated : a));
      addLog('UPDATE', `Updated account: ${id}`, 'Account', id);
      await refreshData();
    } catch (error) {
      setAccounts(snapshot);
      console.error('Failed to update account:', error);
      dispatchToastError(error);
    }
  }, [addLog, setAccounts, refreshData]);

  const deleteAccount = useCallback(async (id: string) => {
    const snapshot = accountsRef.current;
    setAccounts(prev => prev.filter(a => a.id !== id));
    try {
      await financeApi.deleteAccount(id);
      addLog('DELETE', `Deleted account: ${id}`, 'Account', id);
      await refreshData();
    } catch (error) {
      setAccounts(snapshot);
      console.error('Failed to delete account:', error);
      dispatchToastError(error);
    }
  }, [addLog, setAccounts, refreshData]);

  const addIncomeSource = useCallback(async (income: IncomeSource) => {
    const tempId = income.id || crypto.randomUUID();
    const optimistic = normalizeIncomeSource({ ...income, id: tempId });
    setIncomeSources(prev => [optimistic, ...prev]);
    try {
      const newIncome = await financeApi.createIncomeSource(income);
      setIncomeSources(prev => prev.map(i => i.id === tempId ? normalizeIncomeSource(newIncome) : i));
      addLog('CREATE', `Added income source: ${newIncome.source}`, 'IncomeSource', newIncome.id);
      await refreshData();
    } catch (error) {
      setIncomeSources(prev => prev.filter(i => i.id !== tempId));
      console.error('Failed to add income source:', error);
      dispatchToastError(error);
    }
  }, [addLog, setIncomeSources, refreshData]);

  const updateIncomeSource = useCallback(async (id: string, updates: Partial<IncomeSource>) => {
    const snapshot = incomeSourcesRef.current;
    setIncomeSources(prev => prev.map(i => i.id === id ? normalizeIncomeSource({ ...i, ...updates, id }) : i));
    try {
      const updated = await financeApi.updateIncomeSource(id, updates);
      setIncomeSources(prev => prev.map(i => i.id === id ? normalizeIncomeSource(updated) : i));
      addLog('UPDATE', `Updated income source: ${id}`, 'IncomeSource', id);
      await refreshData();
    } catch (error) {
      setIncomeSources(snapshot);
      console.error('Failed to update income source:', error);
      dispatchToastError(error);
    }
  }, [addLog, setIncomeSources, refreshData]);

  const deleteIncomeSource = useCallback(async (id: string) => {
    const snapshot = incomeSourcesRef.current;
    setIncomeSources(prev => prev.filter(i => i.id !== id));
    try {
      await financeApi.deleteIncomeSource(id);
      addLog('DELETE', `Deleted income source: ${id}`, 'IncomeSource', id);
      await refreshData();
    } catch (error) {
      setIncomeSources(snapshot);
      console.error('Failed to delete income source:', error);
      dispatchToastError(error);
    }
  }, [addLog, setIncomeSources, refreshData]);

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile(prev => ({
      ...prev,
      ...updates,
      preferences: {
        ...prev.preferences,
        ...(updates.preferences || {})
      }
    }));

    const meaningfulUpdate = updates.name || updates.email || updates.role;
    const isRealUser = (updates.email && updates.email !== 'guest@example.com') || (userProfile.email && userProfile.email !== 'guest@example.com');
    if (meaningfulUpdate && isRealUser) {
      addLog('UPDATE', 'Updated user profile', 'UserProfile', 'user-1');
    }
  }, [addLog, userProfile.email, setUserProfile]);

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
  }, [setTransactions]);

  const addCategory = useCallback((category: { name: string; color: string; icon: string }) => {
    setCustomCategories(prev => [...prev, category]);
    addLog('CREATE', `Added category: ${category.name}`, 'Category', category.name);
  }, [addLog, setCustomCategories]);

  const deleteCategory = useCallback((name: string) => {
    setCustomCategories(prev => prev.filter(c => c.name !== name));
    setTransactions(prev => prev.map(t => t.category === name ? { ...t, category: 'Uncategorized', confidence: 0.5 } : t));
    addLog('DELETE', `Deleted category: ${name}`, 'Category', name);
  }, [addLog, setCustomCategories, setTransactions]);

  const addCarbonEntry = useCallback((entry: CarbonEntry) => {
    setCarbonEntries(prev => [entry, ...prev]);
  }, [setCarbonEntries]);

  const updateCarbonEntry = useCallback((id: string, updates: Partial<CarbonEntry>) => {
    setCarbonEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, [setCarbonEntries]);

  const deleteCarbonEntry = useCallback((id: string) => {
    setCarbonEntries(prev => prev.filter(e => e.id !== id));
  }, [setCarbonEntries]);

  const addTaxReport = useCallback((report: TaxReport) => {
    setTaxReports(prev => [report, ...prev]);
  }, [setTaxReports]);

  const deleteTaxReport = useCallback((id: string) => {
    setTaxReports(prev => prev.filter(r => r.id !== id));
  }, [setTaxReports]);

  const addForecast = useCallback((forecast: ForecastResult) => {
    setForecasts(prev => [forecast, ...prev]);
  }, [setForecasts]);

  const analyzeFile = useCallback(async (file: File, type: 'bill' | 'statement') => {
    setIsLoading(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;
      const parsedTransactions = await financeApi.analyzeAIFile(base64Data, file.type, type, accounts);
      await addTransactions(parsedTransactions);
      addLog('CREATE', `Analyzed uploaded ${type}: ${file.name}`, 'FileAnalysis', 'file-1');
    } catch (error) {
      console.error('Failed to analyze file:', error);
      dispatchToastError(error);
    } finally {
      setIsLoading(false);
    }
  }, [accounts, addTransactions, addLog, setIsLoading]);

  return (
    <FinanceContext.Provider value={{
      transactions,
      savingsGoals,
      recurringPayments,
      recurringTransactions: recurringPayments,
      loans,
      budgets,
      accounts,
      bankAccounts: accounts,
      categories,
      incomeSources,
      investments,
      auditLogs,
      familyAccount,
      userProfile,
      isLoggedIn,
      login,
      signup,
      logout,
      updateUserProfile,
      clearDataForNewUser,
      refreshData,
      spendingDataByCurrency,
      isLoading,
      financeHydrated,
      dataRefreshError,
      clearDataRefreshError,
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
      getTotalBalance,
      getMonthlyIncome,
      getMonthlyExpenses,
      getNetWorth,
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
