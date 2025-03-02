import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { log } from "./vite";

// Initialize database connection with retries
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds

async function initializeDatabase() {
  let retries = MAX_RETRIES;
  let lastError = null;

  while (retries > 0) {
    try {
      log(`Attempting database connection (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})...`);

      const pool = new Pool({
        // Using individual credential components instead of connection string
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE,
        // Disable SSL for local development
        ssl: false
      });

      // Test connection
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      log('Database connection successful:', result.rows[0]);
      client.release();

      // Add error handler
      pool.on('error', (err) => {
        log('Unexpected error on idle client:', err.message);
        // Don't exit process, just log the error
        log('Pool error occurred, will attempt to recover');
      });

      return pool;
    } catch (err) {
      lastError = err;
      retries--;

      log('Database connection error:', err instanceof Error ? err.message : String(err));

      if (retries === 0) {
        log('Failed to connect to database after maximum retries');
        log('Last error:', err instanceof Error ? err.message : String(err));
        throw new Error(`Database connection failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      log(`Retrying in ${RETRY_DELAY/1000} seconds... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  throw lastError;
}

// Initialize pool
let pool: Pool;

log('Initializing database connection...');
try {
  pool = await initializeDatabase();
  log('Database initialization completed');
} catch (err) {
  log('Fatal database initialization error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}

export const db = drizzle(pool);
export { pool };