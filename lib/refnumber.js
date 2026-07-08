import { getPool } from "./db";

/**
 * Read-only preview of what the NEXT reference number would be, without
 * incrementing the counter. Used to show the expected number on a new
 * form before the person has actually saved anything — if they cancel,
 * nothing was reserved, so no gaps appear in the sequence. Each company
 * (PSMS / PPM) has its own independent sequence.
 */
export async function peekNextRefNumber(docType, initials, company = "PSMS") {
  const pool = getPool();
  const year = String(new Date().getFullYear()).slice(-2);
  const cleanInitials = initials.toUpperCase().trim();
  const companyValue = ["PSMS", "PPM"].includes(company) ? company : "PSMS";

  const { rows } = await pool.query(
    `SELECT last_seq FROM ref_counters WHERE doc_type=$1 AND initials=$2 AND year=$3 AND company=$4`,
    [docType, cleanInitials, year, companyValue]
  );
  const nextSeq = rows.length === 0 ? 1 : rows[0].last_seq + 1;
  const seqStr = String(nextSeq).padStart(2, "0");
  return `${companyValue}/${docType}/${cleanInitials}/${year}/${seqStr}`;
}

/**
 * Generates the next reference number for a given document type, engineer,
 * and company. Format: PSMS/BM/[Initials]/YY/XXX or PPM/ADV/[Initials]/YY/XXX
 * — each company keeps its own independent sequence.
 *
 * Uses SELECT ... FOR UPDATE inside a transaction so two concurrent
 * submissions never receive the same number.
 *
 * @param {"ADV"|"BM"} docType
 * @param {string} initials
 * @param {"PSMS"|"PPM"} company
 * @returns {Promise<string>} e.g. "PPM/ADV/AH/26/01"
 */
export async function nextRefNumber(docType, initials, company = "PSMS") {
  const pool = getPool();
  const client = await pool.connect();
  const year = String(new Date().getFullYear()).slice(-2);
  const cleanInitials = initials.toUpperCase().trim();
  const companyValue = ["PSMS", "PPM"].includes(company) ? company : "PSMS";

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT last_seq FROM ref_counters WHERE doc_type=$1 AND initials=$2 AND year=$3 AND company=$4 FOR UPDATE`,
      [docType, cleanInitials, year, companyValue]
    );

    let nextSeq;
    if (existing.rows.length === 0) {
      nextSeq = 1;
      await client.query(
        `INSERT INTO ref_counters (doc_type, initials, year, company, last_seq) VALUES ($1,$2,$3,$4,$5)`,
        [docType, cleanInitials, year, companyValue, nextSeq]
      );
    } else {
      nextSeq = existing.rows[0].last_seq + 1;
      await client.query(
        `UPDATE ref_counters SET last_seq=$1 WHERE doc_type=$2 AND initials=$3 AND year=$4 AND company=$5`,
        [nextSeq, docType, cleanInitials, year, companyValue]
      );
    }

    await client.query("COMMIT");

    const seqStr = String(nextSeq).padStart(2, "0");
    return `${companyValue}/${docType}/${cleanInitials}/${year}/${seqStr}`;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
