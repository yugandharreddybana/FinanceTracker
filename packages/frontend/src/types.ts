export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  type: 'expense' | 'income';
  status: 'confirmed' | 'pending';
  aiTag?: string;
  account?: string;
  confidence?: number;
  savingsGoalId?: string;
  currency?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  emoji: string;
  deadline?: string;
  isHero?: boolean;
  currency?: string;
}

export interface FinancialHealth {
  savingsRate: number;
  debtRatio: number;
  emergencyFund: number;
  budgetAdherence: number;
  score: number;
}

export interface BankAccount {
  id: string;
  name: string;
  type: 'Current' | 'Savings' | 'Credit';
  balance: number;
  bank: string;
  color: string;
  lastSynced: string;
  currency?: string;
  // Credit Card specific
  creditLimit?: number;
  dueDate?: string;
  apr?: number;
  minPayment?: number;
  cardNetwork?: 'Visa' | 'Mastercard' | 'Amex' | 'Discover';
  cardNumberLast4?: string;
  isJoint?: boolean;
  isPrimary?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
}


export interface Budget {
  id: string;
  category: string;
  emoji: string;
  limit: number;
  spent: number;
  color: string;
  period?: 'Monthly' | 'Weekly' | 'Annual';
  rolloverEnabled?: boolean;
  rolloverAmount?: number;
  perTransactionLimit?: number;
  dueDate?: string;
  currency?: string;
}

export interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  date: number; // day of month
  dueDate?: string;
  category: string;
  frequency: 'Monthly' | 'Weekly' | 'Annual';
  status: 'Active' | 'Paused';
  currency?: string;
  description?: string;
  paymentMethod?: string;
  history?: {
    date: string;
    amount: number;
    status: 'Success' | 'Failed';
  }[];
}

export interface IncomeSource {
  id: string;
  source: string;
  amount: number;
  lastReceivedDate: string;
  nextPaymentDate?: string;
  frequency: string;
  color: string;
  currency?: string;
}

export interface Loan {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyEMI: number;
  interestRate: number;
  tenureYears: number;
  startDate: string;
  endDate: string;
  category: string;
  color: string;
  currency?: string;
  payments?: {
    date: string;
    amount: number;
    principal: number;
    interest: number;
  }[];
}

export interface Insight {
  id: string;
  type: 'ALERT' | 'WARNING' | 'WIN' | 'TIP' | 'TREND';
  title: string;
  description: string;
  date: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatar?: string;
  preferences: {
    theme: 'dark' | 'light' | 'glass';
    currency: string;
    language: string;
    notifications: boolean;
  };
  familyId?: string;
}

/** Context bundled with Yugi Oracle streaming chat (trimmed server-side). */
export interface OracleFinanceContextPayload {
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  loans: Loan[];
  recurringPayments: RecurringPayment[];
  investments: Investment[];
  incomeSources: IncomeSource[];
  netWorthByCurrency: Record<string, {
    total: number;
    assets: number;
    liabilities: number;
    income: number;
    expenses: number;
    change: number;
  }>;
  healthMetricsByCurrency: Record<string, {
    savingsRate: number;
    debtRatio: number;
    emergencyFund: number;
    budgetAdherence: number;
    overallScore: number;
  }>;
  preferences: UserProfile['preferences'];
  customCategories: { name: string; color: string; icon: string }[];
  monthlyTrends: { month: string; [key: string]: number | string }[];
}

export interface Investment {
  id: string;
  symbol: string;
  name: string;
  type: 'Stock' | 'Crypto' | 'ETF';
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currency: string;
  lastUpdated: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  entityType: string;
  entityId: string;
}

export interface FamilyAccount {
  id: string;
  name: string;
  members: {
    uid: string;
    name: string;
    role: 'Admin' | 'Member';
  }[];
  sharedBudgets: string[]; // Budget IDs
  sharedAccounts: string[]; // BankAccount IDs
}

export interface CarbonEntry {
  id: string;
  date: string;
  category: 'transport' | 'food' | 'energy' | 'shopping' | 'other';
  description: string;
  kgCO2: number;
  currency?: string;
}

export interface TaxReport {
  id: string;
  year: number;
  generatedAt: string;
  summary: string;
  totalIncome: number;
  estimatedTax: number;
  currency: string;
}

export interface ForecastResult {
  id: string;
  generatedAt: string;
  months: { month: string; projected: number; currency: string }[];
  summary: string;
}

export type PlanTier = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface SubscriptionSummary {
  tier: PlanTier;
  limits: Record<string, number | null>;
  usage: Record<string, number>;
  ai: {
    used: number;
    limit: number | null;
    remaining?: number | null;
    resetsAt: string;
  };
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  billingCurrency?: string | null;
  stripeCustomerId?: string | null;
}
