import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { log } from '../vite';

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Pool configuration with reasonable defaults
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait for a connection
  application_name: 'zecko_marketplace' // Identify the application in database logs
};

// Create the connection pool
const pool = new Pool(poolConfig);

// Add error handling for unexpected pool errors
pool.on('error', (err) => {
  log('Unexpected database pool error:', err.message);
});

// Add connection handling
pool.on('connect', () => {
  log('New database connection established');
});

pool.on('acquire', () => {
  log('Client acquired from pool');
});

pool.on('remove', () => {
  log('Client removed from pool');
});

// Export the drizzle instance
export const db = drizzle(pool);

// Health check function that doesn't block
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    log('Database health check failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export { pool };