import pg from 'pg';

async function run() {
  const client = new pg.Client({
    connectionString: "postgres://postgres.gppcofxrfuxnmgvlpend:ItzMeYugi@0809@aws-1-eu-west-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'finance_app' AND table_name = 'transactions'
      ORDER BY ordinal_position;
    `);
    
    console.log(JSON.stringify(res.rows, null, 2));
    
  } catch (err) {
    console.error("DB ERROR:", err.message);
  } finally {
    await client.end();
  }
}

run();
