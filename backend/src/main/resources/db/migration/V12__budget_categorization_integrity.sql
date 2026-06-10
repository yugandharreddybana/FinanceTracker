-- =============================================================================
-- Migration V12: Budget Categorization Integrity
-- Enforces uniqueness for budget categories per period and user.
-- =============================================================================

-- ISSUE 5.018 FIX: Prevent duplicate budgets for the same category/period.
-- Uses lower(category) to handle casing inconsistencies and excludes soft-deleted records.
CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_user_cat_period 
    ON finance_app.budgets (user_id, lower(category), period_start)
    WHERE deleted = false;
