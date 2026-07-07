import { query } from "./db";

export async function getAdvanceRequestById(id) {
  const { rows } = await query(
    `SELECT ar.*,
        eng.full_name AS engineer_name, eng.initials AS engineer_initials, eng.designation AS engineer_designation,
        prep.full_name AS prepared_by_name,
        chk.full_name AS checked_by_name,
        appr.full_name AS approved_by_name
     FROM advance_requests ar
     JOIN users eng ON eng.id = ar.engineer_id
     LEFT JOIN users prep ON prep.id = ar.prepared_by
     LEFT JOIN users chk ON chk.id = ar.checked_by
     LEFT JOIN users appr ON appr.id = ar.approved_by
     WHERE ar.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getBillSummaryById(id) {
  const { rows } = await query(
    `SELECT bs.*,
        eng.full_name AS engineer_name, eng.initials AS engineer_initials, eng.designation AS engineer_designation,
        prep.full_name AS prepared_by_name,
        chk.full_name AS checked_by_name,
        appr.full_name AS approved_by_name,
        ar.ref_number AS advance_ref_number
     FROM bill_summaries bs
     JOIN users eng ON eng.id = bs.engineer_id
     LEFT JOIN users prep ON prep.id = bs.prepared_by
     LEFT JOIN users chk ON chk.id = bs.checked_by
     LEFT JOIN users appr ON appr.id = bs.approved_by
     LEFT JOIN advance_requests ar ON ar.id = bs.advance_request_id
     WHERE bs.id = $1`,
    [id]
  );
  return rows[0] || null;
}
