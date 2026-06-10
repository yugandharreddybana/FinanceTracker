-- =============================================================================
-- Migration V1: Baseline schema representing the database state at launch
-- =============================================================================

-- App Users (Initial simple store)
CREATE TABLE IF NOT EXISTS finance_app.app_users (
    id              VARCHAR(255) PRIMARY KEY,
    display_name    VARCHAR(255),
    email           VARCHAR(255) UNIQUE,
    username        VARCHAR(255) UNIQUE
);

-- Authenticators
CREATE TABLE IF NOT EXISTS finance_app.authenticators (
    credential_id   VARCHAR(255) PRIMARY KEY,
    user_id         VARCHAR(255),
    public_key      TEXT,
    sign_count      BIGINT,
    transports      VARCHAR(255)
);

-- Bank Accounts (Legacy VARCHAR last_synced, no version, no soft delete)
CREATE TABLE IF NOT EXISTS finance_app.bank_accounts (
    id                  VARCHAR(255) PRIMARY KEY,
    user_id             VARCHAR(255) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    type                VARCHAR(255),
    balance             NUMERIC(15,2),
    bank                VARCHAR(255),
    color               VARCHAR(255),
    currency            VARCHAR(10),
    last_synced         VARCHAR(255), -- Legacy format
    credit_limit        NUMERIC(15,2),
    due_date            VARCHAR(255),
    apr                 NUMERIC(5,2),
    min_payment         NUMERIC(15,2),
    card_network        VARCHAR(255),
    card_number_last4   VARCHAR(255),
    is_joint            BOOLEAN,
    is_primary          BOOLEAN
);

-- Budgets (No period tracking columns)
CREATE TABLE IF NOT EXISTS finance_app.budgets (
    id                      VARCHAR(255) PRIMARY KEY,
    user_id                 VARCHAR(255) NOT NULL,
    category                VARCHAR(255),
    budget_limit            NUMERIC(15,2),
    spent                   NUMERIC(15,2),
    currency                VARCHAR(10),
    color                   VARCHAR(255),
    emoji                   VARCHAR(255),
    due_date                VARCHAR(255),
    rollover_enabled        BOOLEAN,
    rollover_amount         NUMERIC(15,2),
    per_transaction_limit   NUMERIC(15,2)
);

-- Family Accounts (No soft delete)
CREATE TABLE IF NOT EXISTS finance_app.family_accounts (
    id              VARCHAR(255) PRIMARY KEY,
    owner_id        VARCHAR(255) NOT NULL,
    name            VARCHAR(255),
    members         JSONB,
    shared_accounts JSONB,
    shared_budgets  JSONB
);

-- Income Sources (Legacy VARCHAR date column, no soft delete)
CREATE TABLE IF NOT EXISTS finance_app.income_sources (
    id          VARCHAR(255) PRIMARY KEY,
    user_id     VARCHAR(255) NOT NULL,
    source      VARCHAR(255) NOT NULL,
    amount      NUMERIC(15,2) NOT NULL,
    frequency   VARCHAR(255),
    currency    VARCHAR(10),
    color       VARCHAR(255),
    date        VARCHAR(255) -- Legacy date string
);

-- Investments (Legacy VARCHAR last_updated, no soft delete)
CREATE TABLE IF NOT EXISTS finance_app.investments (
    id              VARCHAR(255) PRIMARY KEY,
    user_id         VARCHAR(255) NOT NULL,
    symbol          VARCHAR(255) NOT NULL,
    name            VARCHAR(255),
    type            VARCHAR(255),
    quantity        NUMERIC(15,8) NOT NULL,
    average_price   NUMERIC(15,2) NOT NULL,
    current_price   NUMERIC(15,2),
    currency        VARCHAR(10),
    last_updated    VARCHAR(255) -- Legacy format
);

-- Loans
CREATE TABLE IF NOT EXISTS finance_app.loans (
    id                  VARCHAR(255) PRIMARY KEY,
    user_id             VARCHAR(255) NOT NULL,
    name                VARCHAR(255),
    total_amount        NUMERIC(15,2),
    remaining_amount    NUMERIC(15,2),
    interest_rate       NUMERIC(5,2),
    tenure_years        INTEGER CHECK (tenure_years >= 1 AND tenure_years <= 50),
    monthlyemi          NUMERIC(15,2),
    start_date          VARCHAR(255),
    end_date            VARCHAR(255),
    category            VARCHAR(255),
    currency            VARCHAR(10),
    color               VARCHAR(255),
    payments            JSONB
);

-- Recurring Payments (No soft delete)
CREATE TABLE IF NOT EXISTS finance_app.recurring_payments (
    id              VARCHAR(255) PRIMARY KEY,
    user_id         VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    amount          NUMERIC(15,2) NOT NULL,
    frequency       VARCHAR(255),
    category        VARCHAR(255),
    currency        VARCHAR(10),
    due_date        VARCHAR(255),
    day_of_month    INTEGER,
    status          VARCHAR(255),
    payment_method  VARCHAR(255),
    description     VARCHAR(255),
    history         JSONB
);

-- Savings Goals (No soft delete)
CREATE TABLE IF NOT EXISTS finance_app.savings_goals (
    id              VARCHAR(255) PRIMARY KEY,
    user_id         VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    target          NUMERIC(15,2) NOT NULL,
    current_amount  NUMERIC(15,2),
    deadline        VARCHAR(255),
    currency        VARCHAR(10),
    emoji           VARCHAR(255),
    is_hero         BOOLEAN
);

-- Transactions (Legacy VARCHAR date string, no idempotency/audit columns)
CREATE TABLE IF NOT EXISTS finance_app.transactions (
    id              VARCHAR(255) PRIMARY KEY,
    user_id         VARCHAR(255) NOT NULL,
    account         VARCHAR(255),
    amount          NUMERIC(15,2),
    type            VARCHAR(255),
    category        VARCHAR(255),
    merchant        VARCHAR(255),
    date            VARCHAR(255), -- Legacy date string
    status          VARCHAR(255),
    currency        VARCHAR(10),
    savings_goal_id VARCHAR(255),
    ai_tag          VARCHAR(255),
    confidence      NUMERIC(5,2)
);

-- User Profiles
CREATE TABLE IF NOT EXISTS finance_app.user_profiles (
    id          VARCHAR(255) PRIMARY KEY,
    name        VARCHAR(255),
    email       VARCHAR(255),
    family_id   VARCHAR(255),
    role        VARCHAR(255),
    avatar      TEXT,
    timezone    VARCHAR(64),
    preferences JSONB
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS finance_app.audit_logs (
    id          VARCHAR(255) PRIMARY KEY,
    action      VARCHAR(255),
    entity_id   VARCHAR(255),
    entity_type VARCHAR(255),
    user_id     VARCHAR(255),
    user_name   VARCHAR(255),
    details     TEXT,
    timestamp   VARCHAR(255) -- Legacy string or missing timestamp type
);
