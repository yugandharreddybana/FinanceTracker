import pg from 'pg';

async function run() {
  const client = new pg.Client({
    connectionString: "postgres://postgres.gppcofxrfuxnmgvlpend:ItzMeYugi@0809@aws-1-eu-west-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log("Connected to DB! Executing hard physical schema remediation...");
    
    // Apply the exact physical DDL from the Java entity structure that's missing on live Postgres
    await client.query(`
      ALTER TABLE finance_app.transactions
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64),
      ADD COLUMN IF NOT EXISTS transaction_date DATE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);
    console.log("Remediation 1/2: Added missing Transaction date/audit columns!");

    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'uq_tx_idempotency'
          ) THEN
              ALTER TABLE finance_app.transactions
                  ADD CONSTRAINT uq_tx_idempotency UNIQUE (user_id, idempotency_key);
          END IF;
      END$$;
    `);
    console.log("Remediation 2/2: Provisioned explicit transaction idempotency containment constraint!");
    
    console.log("SUCCESS: Database physically synchronized with back-end expectation matrix!");
    
  } catch (err) {
    console.error("MIGRATION FAILED:", err.message);
  } finally {
    await client.end();
  }
}

run();
