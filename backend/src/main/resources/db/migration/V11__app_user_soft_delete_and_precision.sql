-- =============================================================================
-- Migration V11: User Soft-Delete and Transaction Precision Hardening
-- Adds audit columns for user retention and constrains confidence precision.
-- =============================================================================

-- ISSUE 4.050 FIX: Add soft-delete and lifecycle columns to app_users.
ALTER TABLE finance_app.app_users
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ISSUE 4.052 FIX: Harden transaction confidence precision.
-- The previous NUMERIC(5,2) allowed nonsense values up to 999.99.
-- We re-constrain to NUMERIC(3,2) [0.00 to 1.00].
ALTER TABLE finance_app.transactions
    ALTER COLUMN confidence TYPE NUMERIC(3,2);
