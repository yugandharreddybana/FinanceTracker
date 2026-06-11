-- Subscription tiers and monthly AI usage tracking

ALTER TABLE finance_app.app_users
    ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) NOT NULL DEFAULT 'FREE',
    ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(32),
    ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS billing_currency VARCHAR(3);

CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_stripe_customer
    ON finance_app.app_users (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS finance_app.ai_usage_monthly (
    user_id     VARCHAR(255) NOT NULL,
    year_month  VARCHAR(7)   NOT NULL,
    usage_count INTEGER      NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_year_month ON finance_app.ai_usage_monthly (year_month);
