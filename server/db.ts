import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { log } from "./vite";

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// Add connection error handling
pool.on('error', (err: Error) => {
  log('Unexpected error on idle client:', err.message);
  process.exit(-1);
});

// Test database connection and log detailed connection info
async function testConnection() {
  try {
    const client = await pool.connect();
    log('Successfully connected to PostgreSQL database');

    const dbInfo = await client.query('SELECT version(), current_database(), current_user');
    log('Database info:', dbInfo.rows[0]);

    // Test users table
    const usersTest = await client.query('SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)', ['users']);
    log('Users table exists:', usersTest.rows[0].exists);

    client.release();
    return true;
  } catch (err) {
    log('Error connecting to PostgreSQL database:', err instanceof Error ? err.message : String(err));
    throw err;
  }
}

// Initialize connection
testConnection().catch(err => {
  log('Failed to initialize database connection:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

export const db = drizzle(pool);
export { pool };