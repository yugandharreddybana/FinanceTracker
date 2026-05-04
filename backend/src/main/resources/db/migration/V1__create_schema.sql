-- V1: Initial schema for FinanceTracker
-- All tables scoped to finance_app schema

CREATE TABLE IF NOT EXISTS finance_app.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'USER',
  family_id TEXT,
  preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_app.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  merchant TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  date DATE NOT NULL,
  category TEXT,
  type TEXT NOT NULL CHECK (type IN ('INCOME','EXPENSE')),
  account TEXT,
  notes TEXT,
  savings_goal_id UUID,
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON finance_app.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON finance_app.transactions(date DESC);

CREATE TABLE IF NOT EXISTS finance_app.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON finance_app.accounts(user_id);

CREATE TABLE IF NOT EXISTS finance_app.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  limit_amount DECIMAL(15,2) NOT NULL,
  spent DECIMAL(15,2) DEFAULT 0,
  period TEXT DEFAULT 'monthly',
  rollover_enabled BOOLEAN DEFAULT FALSE,
  rollover_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON finance_app.budgets(user_id);

CREATE TABLE IF NOT EXISTS finance_app.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target DECIMAL(15,2) NOT NULL,
  current DECIMAL(15,2) DEFAULT 0,
  deadline DATE,
  emoji TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON finance_app.savings_goals(user_id);

CREATE TABLE IF NOT EXISTS finance_app.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  remaining_amount DECIMAL(15,2),
  monthly_emi DECIMAL(15,2),
  interest_rate DECIMAL(5,2),
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON finance_app.loans(user_id);

CREATE TABLE IF NOT EXISTS finance_app.recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  frequency TEXT NOT NULL,
  day_of_month INTEGER,
  due_date DATE,
  category TEXT,
  account TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_user_id ON finance_app.recurring_payments(user_id);

CREATE TABLE IF NOT EXISTS finance_app.income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  frequency TEXT,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_income_sources_user_id ON finance_app.income_sources(user_id);

CREATE TABLE IF NOT EXISTS finance_app.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT,
  type TEXT NOT NULL,
  quantity DECIMAL(15,6),
  purchase_price DECIMAL(15,2),
  current_price DECIMAL(15,2),
  currency TEXT DEFAULT 'INR',
  purchase_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON finance_app.investments(user_id);
