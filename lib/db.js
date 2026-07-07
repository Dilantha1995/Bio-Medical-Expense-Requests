import { Pool } from "pg";

// Neon requires SSL. A single pooled connection is reused across
// serverless invocations in the same warm lambda.
let pool;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Add it to your environment variables.");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function query(text, params) {
  const pool = getPool();
  return pool.query(text, params);
}
