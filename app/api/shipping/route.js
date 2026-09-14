import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { nextRefNumber } from "@/lib/refnumber";
import { shippingGrandTotal } from "@/lib/shippingCalc";
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
      SELECT sr.*, u.full_name AS engineer_name, u.initials AS engineer_initials
      FROM shipping_expense_requests sr
      JOIN users u ON u.id = sr.engineer_id
    `;
    const params = [];
    const conditions = [];
    if (!session.canViewAllRecords) {
      params.push(session.id);
      conditions.push(`sr.engineer_id = $${params.length}`);
    } else if (engineerId) {
      params.push(engineerId);
      conditions.push(`sr.engineer_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`sr.status = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`sr.request_date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`sr.request_date <= $${params.length}`);
    }
    if (company) {
      params.push(company);
      conditions.push(`sr.company = $${params.length}`);
    }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY sr.created_at DESC LIMIT 500";

    const { rows } = await query(sql, params);
    return NextResponse.json({ shipping: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { requestDate, notes, lineItems, company } = body;

    if (!requestDate || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: "Request date and at least one line item are required." }, { status: 400 });
    }

    const companyValue = ["PSMS", "PPM"].includes(company) ? company : "PSMS";
    const refNumber = await nextRefNumber("SHP", session.initials, companyValue);
    const total = shippingGrandTotal(lineItems);

    const { rows } = await query(
      `INSERT INTO shipping_expense_requests
        (ref_number, engineer_id, request_date, notes, line_items, total_amount, company, status, prepared_by, prepared_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'submitted',$8, now())
       RETURNING *`,
      [refNumber, session.id, requestDate, notes, JSON.stringify(lineItems), total, companyValue, session.id]
    );

    const created = rows[0];
    const checkerIds = await getCheckerIds();
    await notifyMany(checkerIds, "New shipping expense request submitted", `${created.ref_number} (${session.fullName}) needs checking.`, `/shipping/${created.id}`);

    return NextResponse.json({ shipping: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to create shipping expense request." }, { status: e.status || 500 });
  }
}
