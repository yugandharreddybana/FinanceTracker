import { Transaction, SavingsGoal, FinancialHealth, BankAccount, Budget, RecurringPayment, IncomeSource, Insight, Loan } from './types';

const today = new Date();
const getDate = (daysAgo: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', date: getDate(0), merchant: 'Starbucks', amount: -5.50, category: 'Food & Drink', type: 'expense', status: 'confirmed', aiTag: 'Daily Habit', account: 'Main Current', confidence: 0.98, currency: 'USD' },
  { id: '2', date: getDate(1), merchant: 'Apple Store', amount: -1299.00, category: 'Electronics', type: 'expense', status: 'confirmed', aiTag: 'Large Purchase', account: 'Platinum Card', confidence: 0.95, currency: 'EUR' },
  { id: '3', date: getDate(2), merchant: 'Salary', amount: 4500.00, category: 'Income', type: 'income', status: 'confirmed', account: 'Main Current', confidence: 1.0, currency: 'USD' },
  { id: '4', date: getDate(3), merchant: 'Netflix', amount: -15.99, category: 'Entertainment', type: 'expense', status: 'confirmed', aiTag: 'Subscription', account: 'Platinum Card', confidence: 0.99, currency: 'EUR' },
  { id: '5', date: getDate(4), merchant: 'Uber', amount: -24.50, category: 'Transport', type: 'expense', status: 'confirmed', aiTag: 'Commute', account: 'Main Current', confidence: 0.92, currency: 'USD' },
  { id: '6', date: getDate(5), merchant: 'Amazon', amount: -89.99, category: 'Shopping', type: 'expense', status: 'confirmed', aiTag: 'Online', account: 'Platinum Card', confidence: 0.85, currency: 'EUR' },
  { id: '7', date: getDate(6), merchant: 'Unknown Shop', amount: -42.00, category: 'Others', type: 'expense', status: 'confirmed', aiTag: 'Uncertain', account: 'Main Current', confidence: 0.65, currency: 'USD' },
];

export const MOCK_SAVINGS_GOALS: SavingsGoal[] = [
  { id: '1', name: 'Japan Trip ✈️', target: 5000, current: 3200, emoji: '🇯🇵', deadline: '2024-12-01', isHero: true, currency: 'USD' },
  { id: '2', name: 'New Car', target: 35000, current: 12000, emoji: '🚗', deadline: '2025-06-01', currency: 'USD' },
  { id: '3', name: 'Emergency Fund', target: 10000, current: 8500, emoji: '🛡️', deadline: '2024-08-01', currency: 'USD' },
];

export const MOCK_HEALTH: FinancialHealth = {
  savingsRate: 0.35,
  debtRatio: 0.12,
  emergencyFund: 0.85,
  budgetAdherence: 0.92,
  score: 78,
};

export const MOCK_ACCOUNTS: BankAccount[] = [
  { id: '1', name: 'Main Current', type: 'Current', balance: 4250.42, bank: 'Revolut', color: '#7C6EFA', lastSynced: '2 mins ago', currency: 'USD' },
  { id: '2', name: 'Savings Vault', type: 'Savings', balance: 18400.00, bank: 'Marcus', color: '#22D3A5', lastSynced: '1 hour ago', currency: 'USD' },
  { id: '3', name: 'Platinum Card', type: 'Credit', balance: -1240.00, bank: 'Amex', color: '#F43F5E', lastSynced: '5 mins ago', currency: 'EUR' },
];

export const MOCK_BUDGETS: Budget[] = [
  { id: '1', category: 'Housing', emoji: '🏠', limit: 1500, spent: 1500, color: '#7C6EFA', rolloverEnabled: true, rolloverAmount: 0 },
  { id: '2', category: 'Food', emoji: '🍱', limit: 600, spent: 450, color: '#22D3A5', rolloverEnabled: true, rolloverAmount: 50 },
  { id: '3', category: 'Transport', emoji: '🚗', limit: 300, spent: 340, color: '#F43F5E', perTransactionLimit: 50 },
  { id: '4', category: 'Entertainment', emoji: '🎬', limit: 200, spent: 180, color: '#F59E0B', rolloverEnabled: true, rolloverAmount: 20 },
  { id: '5', category: 'Shopping', emoji: '🛍️', limit: 400, spent: 210, color: '#EC4899' },
  { id: '6', category: 'Health', emoji: '🏥', limit: 150, spent: 80, color: '#06B6D4' },
  { id: '7', category: 'Utilities', emoji: '⚡', limit: 250, spent: 220, color: '#8B5CF6' },
];

export const MOCK_RECURRING: RecurringPayment[] = [
  { id: '1', name: 'Netflix', amount: 15.99, date: 17, category: 'Entertainment', frequency: 'Monthly', status: 'Active' },
  { id: '2', name: 'Rent', amount: 1500.00, date: 1, category: 'Housing', frequency: 'Monthly', status: 'Active' },
  { id: '3', name: 'Gym', amount: 45.00, date: 5, category: 'Health', frequency: 'Monthly', status: 'Active' },
  { id: '4', name: 'Spotify', amount: 9.99, date: 12, category: 'Entertainment', frequency: 'Monthly', status: 'Paused' },
];

export const MOCK_INCOME: IncomeSource[] = [
  { id: '1', source: 'Tech Corp Salary', amount: 4500, date: '2024-03-25', frequency: 'Monthly', color: '#7C6EFA' },
  { id: '2', source: 'Freelance Design', amount: 850, date: '2024-03-15', frequency: 'Variable', color: '#22D3A5' },
  { id: '3', source: 'Dividends', amount: 120, date: '2024-03-10', frequency: 'Quarterly', color: '#F59E0B' },
];

export const MOCK_INSIGHTS: Insight[] = [
  { id: '1', type: 'ALERT', title: 'Credit card payment due', description: 'Your Platinum Card payment of €1,240 is due in 3 days.', date: 'Today' },
  { id: '2', type: 'WARNING', title: 'Dining spend is high', description: 'Dining spend is trending 35% above your 3-month average.', date: 'Yesterday' },
  { id: '3', type: 'WIN', title: 'Best savings month!', description: 'You saved €480 more than last month. Great job!', date: '2 days ago' },
  { id: '4', type: 'TIP', title: 'Optimize your savings', description: 'Move €200 to your Japan Trip vault to stay on track.', date: '3 days ago' },
];

export const MOCK_SPENDING_TRENDS = [
  { month: 'Oct', amount: 2400 },
  { month: 'Nov', amount: 2100 },
  { month: 'Dec', amount: 3200 },
  { month: 'Jan', amount: 2800 },
  { month: 'Feb', amount: 2600 },
  { month: 'Mar', amount: 2950 },
];

export const MOCK_FORECAST = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  balance: 12000 + Math.sin(i / 5) * 1000 + i * 50,
  forecast: 12000 + Math.sin(i / 5) * 1050 + i * 55,
  confidenceHigh: 12000 + Math.sin(i / 5) * 1050 + i * 55 + 300,
  confidenceLow: 12000 + Math.sin(i / 5) * 1050 + i * 55 - 300,
}));

export const MOCK_SPENDING = [
  { name: 'Housing', value: 1500, color: '#7C6EFA' },
  { name: 'Food', value: 600, color: '#22D3A5' },
  { name: 'Transport', value: 300, color: '#F43F5E' },
  { name: 'Entertainment', value: 200, color: '#F59E0B' },
  { name: 'Others', value: 400, color: '#8E9299' },
];

export const MOCK_LOANS: Loan[] = [
  {
    id: '1',
    name: 'Home Mortgage',
    totalAmount: 450000,
    remainingAmount: 385000,
    monthlyEMI: 2100,
    interestRate: 3.5,
    startDate: '2020-01-01',
    endDate: '2050-01-01',
    category: 'Housing',
    color: '#7C6EFA'
  },
  {
    id: '2',
    name: 'Tesla Model 3 Loan',
    totalAmount: 45000,
    remainingAmount: 12000,
    monthlyEMI: 650,
    interestRate: 2.9,
    startDate: '2021-06-15',
    endDate: '2026-06-15',
    category: 'Transport',
    color: '#F43F5E'
  }
];
