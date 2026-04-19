import { Transaction, SavingsGoal, FinancialHealth, BankAccount, Budget, RecurringPayment, IncomeSource, Insight, Loan } from './types.ts';

export const MOCK_TRANSACTIONS: Transaction[] = [];

export const MOCK_SAVINGS_GOALS: SavingsGoal[] = [];

export const MOCK_HEALTH: FinancialHealth = {
  savingsRate: 0,
  debtRatio: 0,
  emergencyFund: 0,
  budgetAdherence: 0,
  score: 0,
};

export const MOCK_ACCOUNTS: BankAccount[] = [];

export const MOCK_BUDGETS: Budget[] = [];

export const MOCK_RECURRING: RecurringPayment[] = [];

export const MOCK_INCOME: IncomeSource[] = [];

export const MOCK_INSIGHTS: Insight[] = [];

export const MOCK_LOANS: Loan[] = [];
