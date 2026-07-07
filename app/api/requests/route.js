import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { nextRefNumber } from "@/lib/refnumber";
import { grandTotal } from "@/lib/calc";

export async function GET(req) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let sql = `
      SELECT ar.*, u.full_name AS engineer_name, u.initials AS engineer_initials
      FROM advance_requests ar
      JOIN users u ON u.id = ar.engineer_id
    `;
    const params = [];
    const conditions = [];

    if (session.role === "engineer") {
      params.push(session.id);
      conditions.push(`ar.engineer_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`ar.status = $${params.length}`);
    }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY ar.created_at DESC LIMIT 200";

    const { rows } = await query(sql, params);
    return NextResponse.json({ requests: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { requestDate, destinationLabel, purposeOfTravel, notes, lineItems } = body;

    if (!requestDate || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: "Request date and at least one line item are required." }, { status: 400 });
    }

    const refNumber = await nextRefNumber("ADV", session.initials);
    const total = grandTotal(lineItems);

    const { rows } = await query(
      `INSERT INTO advance_requests
        (ref_number, engineer_id, request_date, destination_label, purpose_of_travel, notes, line_items, total_amount,
         status, prepared_by, prepared_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'submitted',$9, now())
       RETURNING *`,
      [refNumber, session.id, requestDate, destinationLabel, purposeOfTravel, notes, JSON.stringify(lineItems), total, session.id]
    );

    return NextResponse.json({ request: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to create request." }, { status: e.status || 500 });
  }
}
