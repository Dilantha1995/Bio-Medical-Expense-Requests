import { query } from "./db";

// Checkpoints representing the newest column/table added in each recent
// update. If any of these are missing, the live database hasn't picked up
// a schema change yet (the setup URL needs to be visited again).
const CHECKPOINTS = [
  { table: "advance_requests", column: "company", introducedIn: "company selection & signatures" },
  { table: "users", column: "signature_data", introducedIn: "digital signatures" },
  { table: "users", column: "bank_account_number", introducedIn: "bank details" },
  { table: "users", column: "must_change_password", introducedIn: "forced password change" },
  { table: "nature_of_payment_options", column: null, introducedIn: "bill summary redesign / configure page" },
  { table: "ref_counters", column: "company", introducedIn: "per-company reference numbers" },
  { table: "pm_schedule_fields", column: null, introducedIn: "PM schedule" },
  { table: "machines", column: null, introducedIn: "machines module" },
];

export async function checkSchemaHealth() {
  const missing = [];

  for (const cp of CHECKPOINTS) {
    if (cp.column) {
      const { rows } = await query(
        `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
        [cp.table, cp.column]
      );
      if (rows.length === 0) missing.push(cp.introducedIn);
    } else {
      const { rows } = await query(
        `SELECT 1 FROM information_schema.tables WHERE table_name=$1`,
        [cp.table]
      );
      if (rows.length === 0) missing.push(cp.introducedIn);
    }
  }

  return { ok: missing.length === 0, missing };
}
