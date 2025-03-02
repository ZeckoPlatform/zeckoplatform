import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";
import { log } from '../server/vite';

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

export const db = drizzle(pool, { schema });
export { pool };