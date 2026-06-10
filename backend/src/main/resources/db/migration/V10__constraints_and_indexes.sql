-- =============================================================================
-- Migration V10: Primary Account Constraints and Secondary Indexes
-- Enforces data integrity and speeds up hero/symbol lookups.
-- =============================================================================

-- ISSUE 4.055 FIX: Enforce only one primary (active) bank account per user.
-- This prevents ambiguity when TransactionService resolves default accounts.
CREATE UNIQUE INDEX IF NOT EXISTS uq_primary_bank_account 
    ON finance_app.bank_accounts(user_id) 
    WHERE is_primary = true AND deleted = false;

-- ISSUE 4.058 FIX: Speed up investment price refresh by indexing the symbol.
CREATE INDEX IF NOT EXISTS idx_investments_symbol
    ON finance_app.investments(symbol);

-- ISSUE 4.059 FIX: Speed up hero goal lookups for the dashboard.
CREATE INDEX IF NOT EXISTS idx_savings_goals_is_hero
    ON finance_app.savings_goals(is_hero) WHERE is_hero = true AND deleted = false;
