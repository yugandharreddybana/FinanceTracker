import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const client = new Client({
  connectionString: process.env.DB_URL.replace('jdbc:postgresql://', 'postgres://'),
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Set schema
    await client.query('SET search_path TO finance_app');
    
    console.log('Adding is_primary column to bank_accounts...');
    await client.query('ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE');
    
    console.log('Schema update completed successfully');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    await client.end();
  }
}

run();
