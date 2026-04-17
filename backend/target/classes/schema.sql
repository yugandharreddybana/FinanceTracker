CREATE SCHEMA IF NOT EXISTS finance_app;

-- Performance indexes (created after Hibernate DDL)
CREATE INDEX IF NOT EXISTS idx_transactions_date ON finance_app.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON finance_app.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON finance_app.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON finance_app.transactions(account);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON finance_app.budgets(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON finance_app.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON finance_app.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON finance_app.user_profiles(email);
