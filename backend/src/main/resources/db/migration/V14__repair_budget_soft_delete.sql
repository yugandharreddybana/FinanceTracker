-- Repair budgets soft-delete columns when Hibernate ddl-auto partially applied schema
-- without backfilling existing rows (see startup DDL failures on deleted NOT NULL).

ALTER TABLE finance_app.budgets
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

UPDATE finance_app.budgets
SET deleted = FALSE
WHERE deleted IS NULL;

ALTER TABLE finance_app.budgets
    ALTER COLUMN deleted SET DEFAULT FALSE;

ALTER TABLE finance_app.budgets
    ALTER COLUMN deleted SET NOT NULL;

ALTER TABLE finance_app.budgets
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_budgets_user_active
    ON finance_app.budgets (user_id) WHERE deleted = false;
