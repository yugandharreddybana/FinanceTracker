-- =============================================================================
-- Migration V5: Add Password Changed At Tracking
-- Supports Issue 2.008 / 2.009 session invalidation upon password rotate
-- =============================================================================

ALTER TABLE finance_app.app_users
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
