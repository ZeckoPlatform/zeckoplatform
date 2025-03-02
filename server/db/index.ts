import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { log } from '../vite';

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds
const POOL_CONFIG = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Initialize connection pool with retries
async function initializePool() {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      log(`Attempting database connection (attempt ${attempt}/${RETRY_ATTEMPTS})`);
      log(`Using database host: ${process.env.PGHOST}`);

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ...POOL_CONFIG
      });

      // Test the connection
      const client = await pool.connect();
      await client.query('SELECT 1'); // Verify we can execute queries
      client.release();

      log('Database connection established successfully');
      return pool;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Database connection attempt ${attempt} failed: ${errorMessage}`);

      if (attempt === RETRY_ATTEMPTS) {
        throw new Error(`Failed to establish database connection after ${RETRY_ATTEMPTS} attempts`);
      }

      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error('Failed to initialize database pool');
}

let pool: Pool;
let isInitialized = false;

// Initialize pool lazily
async function getPool() {
  if (!isInitialized) {
    try {
      pool = await initializePool();
      isInitialized = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Fatal database initialization error: ${errorMessage}`);
      throw error;
    }
  }
  return pool;
}

// Export database instance with lazy initialization
export const db = drizzle(new Pool({
  connectionString: process.env.DATABASE_URL,
  ...POOL_CONFIG
}));

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      log('Database health check successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Database query failed during health check: ${errorMessage}`);
      return false;
    } finally {
      client.release();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Database connection failed during health check: ${errorMessage}`);
    return false;
  }
}

export { pool };