-- =============================================================================
-- Migration V8: Consolidated Performance Indexes
-- Replaces IndexInitializer.java logic and adds missing critical indexes.
-- =============================================================================

-- ISSUE 4.042 FIX: Critical index for listing user transactions (ordered by date)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id_date 
    ON finance_app.transactions(user_id, transaction_date DESC);

-- Consolidated from IndexInitializer.java
CREATE INDEX IF NOT EXISTS idx_transactions_date      ON finance_app.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category  ON finance_app.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type      ON finance_app.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_account   ON finance_app.transactions(account);

CREATE INDEX IF NOT EXISTS idx_budgets_category       ON finance_app.budgets(category);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity      ON finance_app.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp   ON finance_app.audit_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email    ON finance_app.user_profiles(email);

-- ISSUE 4.051 FIX: Add missing user_id indexes for all domain entities
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id  ON finance_app.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id        ON finance_app.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id    ON finance_app.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id  ON finance_app.savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id          ON finance_app.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_user_id ON finance_app.income_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_user_id ON finance_app.recurring_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_family_accounts_owner_id ON finance_app.family_accounts(owner_id);
