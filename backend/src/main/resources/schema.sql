-- Create schema if it doesn't exist (safe to run on every deploy)
CREATE SCHEMA IF NOT EXISTS finance_app;

-- All tables are managed by Hibernate (ddl-auto=update).
-- This file only ensures the schema namespace exists before Hibernate runs.
-- DO NOT add CREATE TABLE or DROP statements here.
