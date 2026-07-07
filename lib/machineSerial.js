import { getPool } from "./db";

/**
 * Generates the next sequential serial number for a given prefix.
 * e.g. nextMachineSerial("PSMS-PM-", 4) -> "PSMS-PM-0001"
 */
export async function nextMachineSerial(prefix, padLen = 4) {
  const pool = getPool();
  const client = await pool.connect();
  const cleanPrefix = prefix.trim();

  try {
    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT last_seq FROM machine_serial_counters WHERE prefix=$1 FOR UPDATE`,
      [cleanPrefix]
    );

    let nextSeq;
    if (existing.rows.length === 0) {
      nextSeq = 1;
      await client.query(
        `INSERT INTO machine_serial_counters (prefix, last_seq) VALUES ($1,$2)`,
        [cleanPrefix, nextSeq]
      );
    } else {
      nextSeq = existing.rows[0].last_seq + 1;
      await client.query(
        `UPDATE machine_serial_counters SET last_seq=$1 WHERE prefix=$2`,
        [nextSeq, cleanPrefix]
      );
    }

    await client.query("COMMIT");
    return cleanPrefix + String(nextSeq).padStart(padLen, "0");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
