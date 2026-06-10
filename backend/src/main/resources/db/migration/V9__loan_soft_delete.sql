-- =============================================================================
-- Migration V9: Loan Soft-delete Support
-- Adds deleted and deleted_at columns to loans table and an active index.
-- =============================================================================

ALTER TABLE finance_app.loans ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE finance_app.loans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_loans_user_active
    ON finance_app.loans (user_id) WHERE deleted = false;
