
    create table "finance_app"."app_users" (
        "email_verified" boolean,
        "hash_iterations" integer,
        "created_at" timestamp(6) with time zone,
        "display_name" varchar(255),
        "email" varchar(255) unique,
        "id" varchar(255) not null,
        "password_hash" varchar(255),
        "salt" varchar(255),
        "username" varchar(255) unique,
        primary key ("id")
    );

    create table "finance_app"."audit_logs" (
        "timestamp" timestamp(6) with time zone not null,
        "action" varchar(255),
        "details" text,
        "entity_id" varchar(255),
        "entity_type" varchar(255),
        "id" varchar(255) not null,
        "user_id" varchar(255),
        "user_name" varchar(255),
        primary key ("id")
    );

    create table "finance_app"."authenticators" (
        "sign_count" bigint,
        "credential_id" varchar(255) not null,
        "public_key" text,
        "transports" varchar(255),
        "user_id" varchar(255),
        primary key ("credential_id")
    );

    create table "finance_app"."bank_accounts" (
        "apr" numeric(5,2),
        "balance" numeric(15,2),
        "credit_limit" numeric(15,2),
        "deleted" boolean not null,
        "is_joint" boolean,
        "is_primary" boolean,
        "min_payment" numeric(15,2),
        "deleted_at" timestamp(6) with time zone,
        "last_synced" timestamp(6) with time zone,
        "version" bigint not null,
        "currency" varchar(10),
        "bank" varchar(255),
        "card_network" varchar(255),
        "card_number_last4" varchar(255),
        "color" varchar(255),
        "due_date" varchar(255),
        "id" varchar(255) not null,
        "name" varchar(255) not null,
        "type" varchar(255),
        "user_id" varchar(255) not null,
        primary key ("id")
    );

    create table "finance_app"."budgets" (
        "budget_limit" numeric(15,2),
        "per_transaction_limit" numeric(15,2),
        "period_end" date,
        "period_start" date,
        "rollover_amount" numeric(15,2),
        "rollover_enabled" boolean,
        "spent" numeric(15,2),
        "currency" varchar(10),
        "category" varchar(255),
        "color" varchar(255),
        "due_date" varchar(255),
        "emoji" varchar(255),
        "id" varchar(255) not null,
        "user_id" varchar(255) not null,
        "period_type" enum ('CUSTOM','MONTHLY','WEEKLY'),
        primary key ("id")
    );

    create table "finance_app"."family_accounts" (
        "deleted" boolean not null,
        "deleted_at" timestamp(6) with time zone,
        "id" varchar(255) not null,
        "name" varchar(255),
        "owner_id" varchar(255) not null,
        "members" jsonb,
        "shared_accounts" jsonb,
        "shared_budgets" jsonb,
        primary key ("id")
    );

    create table "finance_app"."family_invitations" (
        "accepted_at" timestamp(6) with time zone,
        "created_at" timestamp(6) with time zone not null,
        "expires_at" timestamp(6) with time zone not null,
        "family_id" varchar(255) not null,
        "id" varchar(255) not null,
        "invitee_email" varchar(255) not null,
        "inviter_id" varchar(255) not null,
        "token" varchar(255) not null unique,
        "status" enum ('ACCEPTED','EXPIRED','PENDING','REVOKED') not null,
        primary key ("id")
    );

    create table "finance_app"."income_sources" (
        "amount" numeric(15,2) not null,
        "deleted" boolean not null,
        "last_received_date" date,
        "next_payment_date" date,
        "deleted_at" timestamp(6) with time zone,
        "currency" varchar(10),
        "color" varchar(255),
        "frequency" varchar(255),
        "id" varchar(255) not null,
        "source" varchar(255) not null,
        "user_id" varchar(255) not null,
        primary key ("id")
    );

    create table "finance_app"."investments" (
        "average_price" numeric(15,2) not null,
        "current_price" numeric(15,2),
        "deleted" boolean not null,
        "quantity" numeric(15,8) not null,
        "deleted_at" timestamp(6) with time zone,
        "last_updated" timestamp(6) with time zone,
        "currency" varchar(10),
        "id" varchar(255) not null,
        "name" varchar(255),
        "symbol" varchar(255) not null,
        "type" varchar(255),
        "user_id" varchar(255) not null,
        primary key ("id")
    );

    create table "finance_app"."loans" (
        "interest_rate" numeric(5,2),
        "monthlyemi" numeric(15,2),
        "remaining_amount" numeric(15,2),
        "tenure_years" integer check (("tenure_years">=1) and ("tenure_years"<=50)),
        "total_amount" numeric(15,2),
        "currency" varchar(10),
        "category" varchar(255),
        "color" varchar(255),
        "end_date" varchar(255),
        "id" varchar(255) not null,
        "name" varchar(255),
        "start_date" varchar(255),
        "user_id" varchar(255) not null,
        "payments" jsonb,
        primary key ("id")
    );

    create table "finance_app"."recurring_payments" (
        "amount" numeric(15,2) not null,
        "day_of_month" integer,
        "deleted" boolean not null,
        "deleted_at" timestamp(6) with time zone,
        "currency" varchar(10),
        "category" varchar(255),
        "description" varchar(255),
        "due_date" varchar(255),
        "frequency" varchar(255),
        "id" varchar(255) not null,
        "name" varchar(255) not null,
        "payment_method" varchar(255),
        "status" varchar(255),
        "user_id" varchar(255) not null,
        "history" jsonb,
        primary key ("id")
    );

    create table "finance_app"."savings_goals" (
        "current_amount" numeric(15,2),
        "deleted" boolean not null,
        "is_hero" boolean,
        "target" numeric(15,2) not null,
        "deleted_at" timestamp(6) with time zone,
        "currency" varchar(10),
        "deadline" varchar(255),
        "emoji" varchar(255),
        "id" varchar(255) not null,
        "name" varchar(255) not null,
        "user_id" varchar(255) not null,
        primary key ("id")
    );

    create table "finance_app"."transactions" (
        "amount" numeric(15,2),
        "confidence" numeric(5,2),
        "transaction_date" date,
        "created_at" timestamp(6) with time zone not null,
        "currency" varchar(10),
        "account" varchar(255),
        "ai_tag" varchar(255),
        "category" varchar(255),
        "id" varchar(255) not null,
        "idempotency_key" varchar(255),
        "merchant" varchar(255),
        "savings_goal_id" varchar(255),
        "status" varchar(255),
        "type" varchar(255),
        "user_id" varchar(255) not null,
        primary key ("id"),
        constraint uq_tx_idempotency unique ("user_id", "idempotency_key")
    );

    create table "finance_app"."user_profiles" (
        "timezone" varchar(64),
        "avatar" text,
        "email" varchar(255),
        "family_id" varchar(255),
        "id" varchar(255) not null,
        "name" varchar(255),
        "role" varchar(255),
        "preferences" jsonb,
        primary key ("id")
    );
