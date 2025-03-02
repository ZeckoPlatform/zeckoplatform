import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { log } from "./vite";

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Add connection error handling
pool.on('error', (err) => {
  log('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
pool.connect()
  .then(() => {
    log('Successfully connected to PostgreSQL database');
  })
  .catch((err) => {
    log('Error connecting to PostgreSQL database:', err);
    throw err;
  });

export const db = drizzle(pool);
export { pool };
