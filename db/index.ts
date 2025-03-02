import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";
import { log } from '../server/vite';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

log('Initializing database connection...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Disable SSL for local development
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait before timing out when connecting a new client
});

// Add basic error handling
pool.on('error', (err) => {
  log('Unexpected error on idle client:', err.message);
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