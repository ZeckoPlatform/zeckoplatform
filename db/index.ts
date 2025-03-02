import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";
import { log } from "../server/vite";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

let pool: Pool;
let db: ReturnType<typeof drizzle>;

try {
  log("Initializing database connection...");
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  // Test the connection
  pool.on('error', (err) => {
    log(`Unexpected database error: ${err.message}`);
    console.error('Unexpected database error:', err);
  });

  pool.on('connect', () => {
    log("Successfully connected to database");
  });

  db = drizzle(pool, { schema });
  log("Database initialization completed");
} catch (error) {
  log(`Database initialization error: ${error instanceof Error ? error.message : String(error)}`);
  console.error('Database initialization error:', error);
  throw error;
}

export { pool, db };