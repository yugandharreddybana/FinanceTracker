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
    console.log('--- Table Structure Check ---');
    
    const columns = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'finance_app' AND table_name = 'transactions'");
    console.log('Columns in transactions:', columns.rows);
    
    const count = await client.query("SELECT count(*) FROM finance_app.transactions");
    console.log('Total rows in transactions:', count.rows[0].count);
    
    await client.end();
  } catch (err) {
    console.error('Check error:', err.message);
  }
}

check();
