import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { log } from "./vite";

// Initialize database connection with retries
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function initializeDatabase() {
  let retries = MAX_RETRIES;

  while (retries > 0) {
    try {
      log('Attempting database connection...');

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false // Disable SSL for local development
      });

      // Test connection
      const client = await pool.connect();
      log('Successfully connected to PostgreSQL database');

      // Get database information
      const dbInfo = await client.query('SELECT version(), current_database(), current_user');
      log('Database info:', dbInfo.rows[0]);

      // Add error handling for the pool
      pool.on('error', (err: Error) => {
        log('Unexpected error on idle client:', err.message);
        process.exit(-1);
      });

      client.release();
      return pool;
    } catch (err) {
      retries--;
      if (retries === 0) {
        log('Failed to connect to database after maximum retries:', err instanceof Error ? err.message : String(err));
        throw err;
      }
      log(`Database connection failed, retrying in ${RETRY_DELAY/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error('Failed to initialize database');
}

// Initialize pool
let pool: Pool;

try {
  pool = await initializeDatabase();
} catch (err) {
  log('Fatal database initialization error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}

export const db = drizzle(pool);
export { pool };