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
}

export interface Budget {
  id: string;
  category: string;
  emoji: string;
  limit: number;
  spent: number;
  color: string;
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
  category: string;
  frequency: 'Monthly' | 'Weekly' | 'Annual';
  status: 'Active' | 'Paused';
  currency?: string;
}

export interface IncomeSource {
  id: string;
  source: string;
  amount: number;
  date: string;
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
