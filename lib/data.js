import { query } from "./db";
import { billSubmissionStatus } from "./workingDays";

export async function getAppSettings() {
  const { rows } = await query(`SELECT key, value FROM app_settings`);
  const settings = { timezone: "Indian/Maldives", currency: "MVR" };
  rows.forEach((r) => { settings[r.key] = r.value; });
  return settings;
}

export async function getAdvanceRequestById(id) {
  const { rows } = await query(
    `SELECT ar.*,
        eng.full_name AS engineer_name, eng.initials AS engineer_initials, eng.designation AS engineer_designation,
        prep.full_name AS prepared_by_name, prep.signature_data AS prepared_by_signature,
        chk.full_name AS checked_by_name, chk.signature_data AS checked_by_signature,
        appr.full_name AS approved_by_name, appr.signature_data AS approved_by_signature,
        ret.full_name AS returned_marked_by_name,
        del.full_name AS deleted_by_name,
        pay.full_name AS payment_processed_by_name,
        EXISTS(SELECT 1 FROM bill_summaries bs WHERE bs.advance_request_id = ar.id) AS has_bill_summary
     FROM advance_requests ar
     JOIN users eng ON eng.id = ar.engineer_id
     LEFT JOIN users prep ON prep.id = ar.prepared_by
     LEFT JOIN users chk ON chk.id = ar.checked_by
     LEFT JOIN users appr ON appr.id = ar.approved_by
     LEFT JOIN users ret ON ret.id = ar.returned_marked_by
     LEFT JOIN users del ON del.id = ar.deleted_by
     LEFT JOIN users pay ON pay.id = ar.payment_processed_by
     WHERE ar.id = $1`,
    [id]
  );
  const record = rows[0] || null;
  if (record) {
    record.bill_status = billSubmissionStatus(record.returned_at, record.has_bill_summary);
  }
  return record;
}

export async function getBillSummaryById(id) {
  const { rows } = await query(
    `SELECT bs.*,
        eng.full_name AS engineer_name, eng.initials AS engineer_initials, eng.designation AS engineer_designation,
        prep.full_name AS prepared_by_name, prep.signature_data AS prepared_by_signature,
        chk.full_name AS checked_by_name, chk.signature_data AS checked_by_signature,
        appr.full_name AS approved_by_name, appr.signature_data AS approved_by_signature,
        del.full_name AS deleted_by_name,
        pay.full_name AS payment_processed_by_name,
        ar.ref_number AS advance_ref_number
     FROM bill_summaries bs
     JOIN users eng ON eng.id = bs.engineer_id
     LEFT JOIN users prep ON prep.id = bs.prepared_by
     LEFT JOIN users chk ON chk.id = bs.checked_by
     LEFT JOIN users appr ON appr.id = bs.approved_by
     LEFT JOIN users del ON del.id = bs.deleted_by
     LEFT JOIN users pay ON pay.id = bs.payment_processed_by
     LEFT JOIN advance_requests ar ON ar.id = bs.advance_request_id
     WHERE bs.id = $1`,
    [id]
  );
  return rows[0] || null;
}
