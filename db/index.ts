import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";
import { log } from '../server/vite';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

log('Initializing database connection...');

// Use standard PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Disable SSL for local development
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // Increased timeout for initial connection
});

// Add basic error handling
pool.on('error', (err) => {
  log('Database pool error:', err.message);
  process.exit(1); // Exit on critical database errors
});

pool.on('connect', () => {
  log('Successfully connected to database');
  // Log connection details (without sensitive info)
  const url = new URL(process.env.DATABASE_URL);
  log(`Connected to PostgreSQL at ${url.hostname}`);
});

// Test the connection immediately
pool.query('SELECT NOW()')
  .then(() => log('Database connection test successful'))
  .catch(err => {
    log('Database connection test failed:', err.message);
    process.exit(1);
  });

export const db = drizzle(pool, { schema });
export { pool };