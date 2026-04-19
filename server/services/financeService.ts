import { 
  MOCK_TRANSACTIONS, 
  MOCK_ACCOUNTS, 
  MOCK_BUDGETS, 
  MOCK_LOANS, 
  MOCK_SAVINGS_GOALS, 
  MOCK_RECURRING,
  MOCK_INCOME 
} from "../lib/constants.ts";

class FinanceService {
  transactions = [...MOCK_TRANSACTIONS];
  accounts = [...MOCK_ACCOUNTS];
  budgets = [...MOCK_BUDGETS];
  loans = [...MOCK_LOANS];
  savingsGoals = [...MOCK_SAVINGS_GOALS];
  recurringPayments = [...MOCK_RECURRING];
  incomeSources = [...MOCK_INCOME];

  getTransactions() { return this.transactions; }
  getAccounts() { return this.accounts; }
  getBudgets() { return this.budgets; }
  
  syncTransactions(newTxs: any[]) {
    this.transactions = newTxs;
  }
}

export const financeService = new FinanceService();
