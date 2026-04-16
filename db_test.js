import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.gppcofxrfuxnmgvlpend.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'ItzMeYugi@0809',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    await client.connect();
    console.log('--- Database Check ---');
    
    const schemas = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'finance_app'");
    console.log('Schema finance_app exists:', schemas.rows.length > 0);

    if (schemas.rows.length > 0) {
      const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'finance_app'");
      console.log('Tables:', tables.rows.map(r => r.table_name));
      
      const nulls = await client.query("SELECT count(*) FROM finance_app.transactions WHERE status IS NULL OR type IS NULL");
      console.log('Transactions with NULL status/type:', nulls.rows[0].count);
    }
    
    await client.end();
  } catch (err) {
    console.error('Check error:', err.message);
  }
}

check();
