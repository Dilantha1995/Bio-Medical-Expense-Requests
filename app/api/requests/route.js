import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { nextRefNumber } from "@/lib/refnumber";
import { grandTotal } from "@/lib/calc";
import { billSubmissionStatus } from "@/lib/workingDays";
import { notifyMany, getCheckerIds } from "@/lib/notifications";

export async function GET(req) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const company = searchParams.get("company");
    const engineerId = searchParams.get("engineerId");

    let sql = `
      SELECT ar.*, u.full_name AS engineer_name, u.initials AS engineer_initials,
        EXISTS(SELECT 1 FROM bill_summaries bs WHERE bs.advance_request_id = ar.id) AS has_bill_summary
      FROM advance_requests ar
      JOIN users u ON u.id = ar.engineer_id
    `;
    const params = [];
    const conditions = [];

    if (session.role === "engineer") {
      params.push(session.id);
      conditions.push(`ar.engineer_id = $${params.length}`);
    } else if (engineerId) {
      params.push(engineerId);
      conditions.push(`ar.engineer_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`ar.status = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`ar.request_date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`ar.request_date <= $${params.length}`);
    }
    if (company) {
      params.push(company);
      conditions.push(`ar.company = $${params.length}`);
    }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY ar.created_at DESC LIMIT 500";

    const { rows } = await query(sql, params);
    rows.forEach((r) => { r.bill_status = billSubmissionStatus(r.returned_at, r.has_bill_summary); });
    return NextResponse.json({ requests: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { requestDate, destinationLabel, purposeOfTravel, notes, lineItems, company } = body;

    if (!requestDate || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: "Request date and at least one line item are required." }, { status: 400 });
    }

    const companyValue = ["PSMS", "PPM"].includes(company) ? company : "PSMS";
    const refNumber = await nextRefNumber("ADV", session.initials, companyValue);
    const total = grandTotal(lineItems);

    const { rows } = await query(
      `INSERT INTO advance_requests
        (ref_number, engineer_id, request_date, destination_label, purpose_of_travel, notes, line_items, total_amount,
         company, status, prepared_by, prepared_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'submitted',$10, now())
       RETURNING *`,
      [refNumber, session.id, requestDate, destinationLabel, purposeOfTravel, notes, JSON.stringify(lineItems), total, companyValue, session.id]
    );

    const created = rows[0];
    const checkerIds = await getCheckerIds();
    await notifyMany(checkerIds, "New advance request submitted", `${created.ref_number} (${session.fullName}) needs checking.`, `/requests/${created.id}`);

    return NextResponse.json({ request: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to create request." }, { status: e.status || 500 });
  }
}
