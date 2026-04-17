const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.gppcofxrfuxnmgvlpend:ItzMeYugi@0809@aws-1-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

const tables = [
  'finance_app.audit_logs',
  'finance_app.transactions',
  'finance_app.savings_goals',
  'finance_app.recurring_payments',
  'finance_app.loans',
  'finance_app.budgets',
  'finance_app.bank_accounts',
  'finance_app.income_sources',
  'finance_app.investments',
  'finance_app.family_accounts',
  'finance_app.user_profiles',
];

async function clearDatabase() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL');

  try {
    for (const table of tables) {
      await client.query(`TRUNCATE ${table} CASCADE`);
      console.log(`✓ Cleared ${table}`);
    }
    console.log('\nAll tables cleared successfully.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

clearDatabase();
