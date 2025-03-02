import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";
import { log } from '../server/vite';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export async function initializeDatabase() {
  try {
    log("Initializing database connection...");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000
    });

    // Test the connection immediately
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT 1');
      log(`Database connection test successful: ${result.rowCount} row(s) returned`);

      // Only initialize Drizzle after successful connection test
      db = drizzle(pool, { schema });
      log("Database ORM initialization completed");
    } finally {
      client.release();
    }
  } catch (error) {
    log(`Database initialization error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }

  if (!db || !pool) {
    throw new Error("Database initialization failed");
  }

  return { pool, db };
}

// Export getters that ensure db/pool are initialized
export function getDatabaseClient() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase() first");
  }
  return db;
}

export function getPool() {
  if (!pool) {
    throw new Error("Database pool not initialized. Call initializeDatabase() first");
  }
  return pool;
}