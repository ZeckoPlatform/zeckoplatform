import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "./schema";
import { log } from '../server/vite';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Add basic error handling
pool.on('error', (err) => {
  log('Unexpected error on idle client', err.message);
});

pool.on('connect', () => {
  log('Successfully connected to database');
});

export const db = drizzle(pool, { schema });
export { pool };