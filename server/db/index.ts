import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { log } from '../vite';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Basic pool configuration using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Reduced from 20 to prevent connection exhaustion
  idleTimeoutMillis: 10000, // Reduced from 30000 to release connections faster
  connectionTimeoutMillis: 3000, // Reduced from 5000 to fail fast
  allowExitOnIdle: true // Allow the pool to cleanup on app shutdown
});

// Add basic error handling
pool.on('error', (err) => {
  log('Unexpected database error:', err.message);
});

// Export the drizzle instance
export const db = drizzle(pool);

// Simple health check function with timeout
export async function checkDatabaseConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      log('Database health check timed out');
      resolve(false);
    }, 2000); // 2 second timeout

    pool.connect()
      .then(client => {
        clearTimeout(timeout);
        client.query('SELECT 1')
          .then(() => {
            client.release();
            resolve(true);
          })
          .catch(err => {
            client.release();
            log('Database query error:', err.message);
            resolve(false);
          });
      })
      .catch(err => {
        clearTimeout(timeout);
        log('Database connection error:', err.message);
        resolve(false);
      });
  });
}

export { pool };