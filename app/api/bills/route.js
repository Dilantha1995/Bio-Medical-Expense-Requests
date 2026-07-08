import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { nextRefNumber } from "@/lib/refnumber";
import { billGrandTotal } from "@/lib/billCalc";

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
      SELECT bs.*, u.full_name AS engineer_name, u.initials AS engineer_initials
      FROM bill_summaries bs
      JOIN users u ON u.id = bs.engineer_id
    `;
    const params = [];
    const conditions = [];
    if (session.role === "engineer") {
      params.push(session.id);
      conditions.push(`bs.engineer_id = $${params.length}`);
    } else if (engineerId) {
      params.push(engineerId);
      conditions.push(`bs.engineer_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`bs.status = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`bs.summary_date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`bs.summary_date <= $${params.length}`);
    }
    if (company) {
      params.push(company);
      conditions.push(`bs.company = $${params.length}`);
    }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY bs.created_at DESC LIMIT 500";

    const { rows } = await query(sql, params);
    return NextResponse.json({ bills: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { summaryDate, destinationLabel, purposeOfTravel, notes, lineItems, advanceRequestId, advanceReceived, company } = body;

    if (!summaryDate || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: "Summary date and at least one line item are required." }, { status: 400 });
    }

    if (advanceRequestId) {
      const owner = await query(`SELECT engineer_id FROM advance_requests WHERE id=$1`, [advanceRequestId]);
      if (!owner.rows[0] || owner.rows[0].engineer_id !== session.id) {
        return NextResponse.json({ error: "That advance request doesn't belong to you." }, { status: 403 });
      }
    }

    const companyValue = ["PSMS", "PPM"].includes(company) ? company : "PSMS";
    const refNumber = await nextRefNumber("BM", session.initials, companyValue);
    const total = billGrandTotal(lineItems);
    const advReceived = parseFloat(advanceReceived) || 0;
    const balance = total - advReceived;

    const { rows } = await query(
      `INSERT INTO bill_summaries
        (ref_number, engineer_id, advance_request_id, summary_date, destination_label, purpose_of_travel, notes,
         line_items, total_amount, advance_received, balance_due, company, status, prepared_by, prepared_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'submitted',$13, now())
       RETURNING *`,
      [refNumber, session.id, advanceRequestId || null, summaryDate, destinationLabel, purposeOfTravel, notes,
        JSON.stringify(lineItems), total, advReceived, balance, companyValue, session.id]
    );

    return NextResponse.json({ bill: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to create bill summary." }, { status: e.status || 500 });
  }
}
