import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  Transaction, 
  SavingsGoal, 
  BankAccount, 
  Budget, 
  RecurringPayment, 
  IncomeSource, 
  Loan, 
  UserProfile, 
  Investment, 
  AuditLog, 
  FamilyAccount, 
  CarbonEntry, 
  TaxReport, 
  ForecastResult 
} from '../types';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Yugandhar Reddy',
  email: 'guest@example.com',
  role: 'Alpha Premium',
  preferences: {
    theme: 'glass',
    currency: 'INR',
    language: 'English',
    notifications: true,
  },
};

export const DEFAULT_CUSTOM_CATEGORIES = [
  { name: 'Housing', color: '#3B82F6', icon: 'Home' },
  { name: 'Utilities', color: '#10B981', icon: 'Zap' },
  { name: 'Shopping', color: '#EC4899', icon: 'ShoppingBag' },
  { name: 'Entertainment', color: '#8B5CF6', icon: 'Film' },
  { name: 'Food', color: '#F59E0B', icon: 'Utensils' },
];

interface FinanceState {
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
  carbonEntries: CarbonEntry[];
  taxReports: TaxReport[];
  forecasts: ForecastResult[];
  userProfile: UserProfile;
  customCategories: { name: string; color: string; icon: string }[];
  isOffline: boolean;
  isLoading: boolean;
  isDataLoaded: boolean;
}

const initialState: FinanceState = {
  transactions: [],
  savingsGoals: [],
  recurringPayments: [],
  loans: [],
  budgets: [],
  accounts: [],
  incomeSources: [],
  investments: [],
  auditLogs: [],
  familyAccount: null,
  carbonEntries: [],
  taxReports: [],
  forecasts: [],
  userProfile: DEFAULT_USER_PROFILE,
  customCategories: DEFAULT_CUSTOM_CATEGORIES,
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  isLoading: false,
  isDataLoaded: false,
};

export const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    setTransactions(state, action: PayloadAction<Transaction[]>) {
      state.transactions = action.payload;
    },
    setSavingsGoals(state, action: PayloadAction<SavingsGoal[]>) {
      state.savingsGoals = action.payload;
    },
    setRecurringPayments(state, action: PayloadAction<RecurringPayment[]>) {
      state.recurringPayments = action.payload;
    },
    setLoans(state, action: PayloadAction<Loan[]>) {
      state.loans = action.payload;
    },
    setBudgets(state, action: PayloadAction<Budget[]>) {
      state.budgets = action.payload;
    },
    setAccounts(state, action: PayloadAction<BankAccount[]>) {
      state.accounts = action.payload;
    },
    setIncomeSources(state, action: PayloadAction<IncomeSource[]>) {
      state.incomeSources = action.payload;
    },
    setInvestments(state, action: PayloadAction<Investment[]>) {
      state.investments = action.payload;
    },
    setAuditLogs(state, action: PayloadAction<AuditLog[]>) {
      state.auditLogs = action.payload;
    },
    setFamilyAccount(state, action: PayloadAction<FamilyAccount | null>) {
      state.familyAccount = action.payload;
    },
    setCarbonEntries(state, action: PayloadAction<CarbonEntry[]>) {
      state.carbonEntries = action.payload;
    },
    setTaxReports(state, action: PayloadAction<TaxReport[]>) {
      state.taxReports = action.payload;
    },
    setForecasts(state, action: PayloadAction<ForecastResult[]>) {
      state.forecasts = action.payload;
    },
    setUserProfile(state, action: PayloadAction<UserProfile | ((prev: UserProfile) => UserProfile)>) {
      if (typeof action.payload === 'function') {
        state.userProfile = action.payload(state.userProfile);
      } else {
        state.userProfile = action.payload;
      }
    },
    setCustomCategories(state, action: PayloadAction<{ name: string; color: string; icon: string }[]>) {
      state.customCategories = action.payload;
    },
    setIsOffline(state, action: PayloadAction<boolean>) {
      state.isOffline = action.payload;
    },
    setIsLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setIsDataLoaded(state, action: PayloadAction<boolean>) {
      state.isDataLoaded = action.payload;
    },
    clearAllData(state) {
      state.transactions = [];
      state.savingsGoals = [];
      state.recurringPayments = [];
      state.loans = [];
      state.budgets = [];
      state.accounts = [];
      state.incomeSources = [];
      state.investments = [];
      state.auditLogs = [];
      state.familyAccount = null;
      state.carbonEntries = [];
      state.taxReports = [];
      state.forecasts = [];
      state.userProfile = DEFAULT_USER_PROFILE;
      state.customCategories = DEFAULT_CUSTOM_CATEGORIES;
      // Fix: reset data-load flags so the next login triggers a fresh fetch
      // and no stuck loading spinner is left visible after logout.
      state.isDataLoaded = false;
      state.isLoading = false;
    }
  },
});

export const {
  setTransactions,
  setSavingsGoals,
  setRecurringPayments,
  setLoans,
  setBudgets,
  setAccounts,
  setIncomeSources,
  setInvestments,
  setAuditLogs,
  setFamilyAccount,
  setCarbonEntries,
  setTaxReports,
  setForecasts,
  setUserProfile,
  setCustomCategories,
  setIsOffline,
  setIsLoading,
  setIsDataLoaded,
  clearAllData
} = financeSlice.actions;

export default financeSlice.reducer;
