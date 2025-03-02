import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { log } from '../vite';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Add basic error handling
pool.on('error', (err) => {
  log('Unexpected error on idle client', err.message);
});

export const db = drizzle(pool);
export { pool };