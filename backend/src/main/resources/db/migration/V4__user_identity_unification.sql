-- =============================================================================
-- Migration V4: User Identity Unification
-- Syncs physical app_users table with AppUser JPA Entity modifications
-- =============================================================================

-- Add Node.js password auth columns to Java app_users table
ALTER TABLE finance_app.app_users
    ADD COLUMN IF NOT EXISTS password_hash     VARCHAR(255),
    ADD COLUMN IF NOT EXISTS salt              VARCHAR(255),
    ADD COLUMN IF NOT EXISTS hash_iterations   INTEGER DEFAULT 10000,
    ADD COLUMN IF NOT EXISTS email_verified    BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();
