-- =============================================================================
-- Migration V7: Soft-delete support for budgets
-- Fixes ISSUE 4.011 — Enforces soft-delete consistency on budgets.
-- =============================================================================

ALTER TABLE finance_app.budgets ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE finance_app.budgets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_budgets_user_active
    ON finance_app.budgets (user_id) WHERE deleted = false;
