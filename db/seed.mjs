// One-time setup script.
// Usage:
//   DATABASE_URL=postgres://... ADMIN_USERNAME=admin ADMIN_PASSWORD=changeme ADMIN_NAME="System Admin" node db/seed.mjs
//
// This creates the tables (if not already created) and one admin account
// so you can log in and add engineers/approvers from the Admin screen.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const {
  DATABASE_URL,
  ADMIN_USERNAME = "admin",
  ADMIN_PASSWORD = "changeme123",
  ADMIN_NAME = "System Admin",
} = process.env;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
  console.log("Applying schema...");
  await pool.query(schema);

  const existing = await pool.query("SELECT id FROM users WHERE username=$1", [ADMIN_USERNAME]);
  if (existing.rows.length > 0) {
    console.log(`User "${ADMIN_USERNAME}" already exists. Skipping admin creation.`);
  } else {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (username, password_hash, full_name, initials, designation, role, can_final_approve, active)
       VALUES ($1,$2,$3,$4,$5,'admin', true, true)`,
      [ADMIN_USERNAME, hash, ADMIN_NAME, "AD", "Administrator"]
    );
    console.log(`Created admin user "${ADMIN_USERNAME}" with password "${ADMIN_PASSWORD}". Please log in and change it.`);
  }

  await pool.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
