import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "./schema";
import { log } from '../vite';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

log('Attempting database connection with URL:', process.env.DATABASE_URL.split('@')[1]); // Log only the host part

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false // Disable SSL for local development
});

// Add basic error handling
pool.on('error', (err) => {
  log('Unexpected error on idle client', err.message);
  process.exit(1); // Exit on critical database errors
});

pool.on('connect', () => {
  log('Successfully connected to database');
});

// Test the connection immediately
pool.query('SELECT 1')
  .then(() => log('Database connection test successful'))
  .catch(err => {
    log('Database connection test failed:', err.message);
    process.exit(1);
  });

export const db = drizzle(pool, { schema });
export { pool };