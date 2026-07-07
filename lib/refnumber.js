import { getPool } from "./db";

/**
 * Generates the next reference number for a given document type and engineer.
 * Format: PSMS / BM / [Initials] / YY / XXX   (bill summaries)
 *         PSMS / ADV / [Initials] / YY / XXX  (advance requests)
 *
 * Uses SELECT ... FOR UPDATE inside a transaction so two concurrent
 * submissions never receive the same number.
 *
 * @param {"ADV"|"BM"} docType
 * @param {string} initials
 * @returns {Promise<string>} e.g. "PSMS/ADV/AH/26/01"
 */
export async function nextRefNumber(docType, initials) {
  const pool = getPool();
  const client = await pool.connect();
  const year = String(new Date().getFullYear()).slice(-2);
  const cleanInitials = initials.toUpperCase().trim();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT last_seq FROM ref_counters WHERE doc_type=$1 AND initials=$2 AND year=$3 FOR UPDATE`,
      [docType, cleanInitials, year]
    );

    let nextSeq;
    if (existing.rows.length === 0) {
      nextSeq = 1;
      await client.query(
        `INSERT INTO ref_counters (doc_type, initials, year, last_seq) VALUES ($1,$2,$3,$4)`,
        [docType, cleanInitials, year, nextSeq]
      );
    } else {
      nextSeq = existing.rows[0].last_seq + 1;
      await client.query(
        `UPDATE ref_counters SET last_seq=$1 WHERE doc_type=$2 AND initials=$3 AND year=$4`,
        [nextSeq, docType, cleanInitials, year]
      );
    }

    await client.query("COMMIT");

    const seqStr = String(nextSeq).padStart(2, "0");
    return `PSMS/${docType}/${cleanInitials}/${year}/${seqStr}`;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
