-- =============================================================================
-- Migration V2: Production-ready schema hardening
-- Fixes FLAW #1 (idempotency), #4/#13 (budget period), #6 (optimistic lock),
--        #10 (audit immutability), #12 (transaction date typing)
-- =============================================================================

-- FLAW #1: Idempotency key column + unique constraint on transactions
ALTER TABLE finance_app.transactions
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64),
    ADD COLUMN IF NOT EXISTS transaction_date DATE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill transaction_date from legacy 'date' string column (best-effort)
UPDATE finance_app.transactions
    SET transaction_date = date::DATE
    WHERE date IS NOT NULL AND transaction_date IS NULL;

-- Unique constraint: one idempotency key per user — prevents duplicate transactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_tx_idempotency'
    ) THEN
        ALTER TABLE finance_app.transactions
            ADD CONSTRAINT uq_tx_idempotency UNIQUE (user_id, idempotency_key);
    END IF;
END$$;

-- FLAW #6: Optimistic lock version column on bank_accounts
ALTER TABLE finance_app.bank_accounts
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- FLAW #13: Budget period columns
ALTER TABLE finance_app.budgets
    ADD COLUMN IF NOT EXISTS period_type VARCHAR(20) DEFAULT 'MONTHLY',
    ADD COLUMN IF NOT EXISTS period_start DATE,
    ADD COLUMN IF NOT EXISTS period_end DATE;

-- Backfill period_start/period_end to current month for existing budgets
UPDATE finance_app.budgets
    SET period_start = DATE_TRUNC('month', NOW())::DATE,
        period_end   = (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day')::DATE
    WHERE period_start IS NULL;

-- FLAW #10: Immutable audit log — prevent any UPDATE or DELETE on audit_logs
-- These rules make the audit table append-only at the database level.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_rules WHERE rulename = 'no_update_audit_logs'
    ) THEN
        EXECUTE 'CREATE RULE no_update_audit_logs AS ON UPDATE TO finance_app.audit_logs DO INSTEAD NOTHING';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_rules WHERE rulename = 'no_delete_audit_logs'
    ) THEN
        EXECUTE 'CREATE RULE no_delete_audit_logs AS ON DELETE TO finance_app.audit_logs DO INSTEAD NOTHING';
    END IF;
END$$;

-- Index to speed up idempotency lookups on high-volume transaction inserts
CREATE INDEX IF NOT EXISTS idx_tx_user_idempotency
    ON finance_app.transactions (user_id, idempotency_key);

-- Index to speed up period-scoped budget spend queries
CREATE INDEX IF NOT EXISTS idx_tx_user_category_date
    ON finance_app.transactions (user_id, category, transaction_date);
