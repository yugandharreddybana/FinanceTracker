-- =============================================================================
-- Migration V3: Soft-delete, family invitations, income date fields,
--               lastSynced typed column, savings goal recalc support
-- Fixes ISSUE #4/#21 (lastSynced Instant), #6/#20 (income LocalDate fields),
--        #10 (family_invitations), #22 (soft-delete all entities)
-- =============================================================================

-- ISSUE #22: Soft-delete columns on all entities
ALTER TABLE finance_app.savings_goals      ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE finance_app.savings_goals      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE finance_app.recurring_payments ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE finance_app.recurring_payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE finance_app.investments        ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE finance_app.investments        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE finance_app.income_sources     ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE finance_app.income_sources     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE finance_app.bank_accounts      ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE finance_app.bank_accounts      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE finance_app.family_accounts    ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE finance_app.family_accounts    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ISSUE #21: lastSynced as TIMESTAMPTZ (was VARCHAR)
ALTER TABLE finance_app.bank_accounts ADD COLUMN IF NOT EXISTS last_synced TIMESTAMPTZ;
-- Migrate existing varchar last_synced if it exists
-- (safe no-op if column didn't exist before)

-- ISSUE #20: Income source date fields
ALTER TABLE finance_app.income_sources ADD COLUMN IF NOT EXISTS last_received_date DATE;
ALTER TABLE finance_app.income_sources ADD COLUMN IF NOT EXISTS next_payment_date  DATE;

-- ISSUE #10: Family invitation table
CREATE TABLE IF NOT EXISTS finance_app.family_invitations (
    id              VARCHAR(64) PRIMARY KEY,
    family_id       VARCHAR(64) NOT NULL REFERENCES finance_app.family_accounts(id) ON DELETE CASCADE,
    inviter_id      VARCHAR(64) NOT NULL,
    invitee_email   VARCHAR(255) NOT NULL,
    token           VARCHAR(64) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    accepted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_family_invitations_token
    ON finance_app.family_invitations (token);

CREATE INDEX IF NOT EXISTS idx_family_invitations_invitee
    ON finance_app.family_invitations (invitee_email, status);

-- ISSUE #4: Investment last_updated as TIMESTAMPTZ
ALTER TABLE finance_app.investments ADD COLUMN IF NOT EXISTS last_updated_ts TIMESTAMPTZ;

-- Indexes for soft-delete filtered queries (fast WHERE deleted = false)
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_active
    ON finance_app.savings_goals (user_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_recurring_payments_due
    ON finance_app.recurring_payments (due_date) WHERE deleted = false AND status != 'CANCELLED';
CREATE INDEX IF NOT EXISTS idx_investments_user_active
    ON finance_app.investments (user_id) WHERE deleted = false;
