import pg from 'pg';

async function run() {
  const client = new pg.Client({
    connectionString: "postgres://postgres.gppcofxrfuxnmgvlpend:ItzMeYugi@0809@aws-1-eu-west-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT version, description, type, script, installed_on, success 
      FROM finance_app.flyway_schema_history 
      ORDER BY installed_rank;
    `);
    
    await import('fs').then(fs => {
      fs.writeFileSync('physical_schema.json', JSON.stringify(res.rows, null, 2), 'utf-8');
    });
    console.log("Schema successfully exported to physical_schema.json!");
    
  } catch (err) {
    console.error("DB ERROR:", err.message);
  } finally {
    await client.end();
  }
}

run();
