import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(req) {
  try {
    const session = await requireSession();
    if (!session.canViewEngineerPerformance) {
      return NextResponse.json({ error: "You're not authorized to view engineer performance." }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    let engineerId = searchParams.get("engineerId");
    if (!session.canViewAllRecords) engineerId = String(session.id);

    const advParams = [];
    const advConditions = ["ar.deleted_at IS NULL"];
    if (from) { advParams.push(from); advConditions.push(`ar.request_date >= $${advParams.length}`); }
    if (to) { advParams.push(to); advConditions.push(`ar.request_date <= $${advParams.length}`); }
    if (engineerId) { advParams.push(engineerId); advConditions.push(`ar.engineer_id = $${advParams.length}`); }

    const advRows = (await query(
      `SELECT ar.engineer_id, u.full_name AS engineer_name, ar.request_type,
         COUNT(*) AS cnt, COALESCE(SUM(ar.total_amount), 0) AS total
       FROM advance_requests ar
       JOIN users u ON u.id = ar.engineer_id
       WHERE ${advConditions.join(" AND ")}
       GROUP BY ar.engineer_id, u.full_name, ar.request_type`,
      advParams
    )).rows;

    const billParams = [];
    const billConditions = ["bs.deleted_at IS NULL"];
    if (from) { billParams.push(from); billConditions.push(`bs.summary_date >= $${billParams.length}`); }
    if (to) { billParams.push(to); billConditions.push(`bs.summary_date <= $${billParams.length}`); }
    if (engineerId) { billParams.push(engineerId); billConditions.push(`bs.engineer_id = $${billParams.length}`); }

    const billRows = (await query(
      `SELECT bs.engineer_id, u.full_name AS engineer_name, COALESCE(SUM(bs.total_amount), 0) AS total
       FROM bill_summaries bs
       JOIN users u ON u.id = bs.engineer_id
       WHERE ${billConditions.join(" AND ")}
       GROUP BY bs.engineer_id, u.full_name`,
      billParams
    )).rows;

    const shipParams = [];
    const shipConditions = ["sr.deleted_at IS NULL"];
    if (from) { shipParams.push(from); shipConditions.push(`sr.request_date >= $${shipParams.length}`); }
    if (to) { shipParams.push(to); shipConditions.push(`sr.request_date <= $${shipParams.length}`); }
    if (engineerId) { shipParams.push(engineerId); shipConditions.push(`sr.engineer_id = $${shipParams.length}`); }

    const shipRows = (await query(
      `SELECT sr.engineer_id, u.full_name AS engineer_name, COALESCE(SUM(sr.total_amount), 0) AS total
       FROM shipping_expense_requests sr
       JOIN users u ON u.id = sr.engineer_id
       WHERE ${shipConditions.join(" AND ")}
       GROUP BY sr.engineer_id, u.full_name`,
      shipParams
    )).rows;

    const byEngineer = {};
    function ensure(id, name) {
      if (!byEngineer[id]) {
        byEngineer[id] = {
          engineerId: id, engineerName: name,
          pmCount: 0, installationCount: 0, trainingCount: 0, otherCount: 0,
          advanceTotal: 0, billTotal: 0, shippingTotal: 0,
        };
      }
      return byEngineer[id];
    }

    for (const r of advRows) {
      const row = ensure(r.engineer_id, r.engineer_name);
      const type = (r.request_type || "").toLowerCase();
      if (type === "preventive maintenance") row.pmCount += Number(r.cnt);
      else if (type === "installation") row.installationCount += Number(r.cnt);
      else if (type === "training") row.trainingCount += Number(r.cnt);
      else row.otherCount += Number(r.cnt);
      row.advanceTotal += Number(r.total);
    }
    for (const r of billRows) {
      const row = ensure(r.engineer_id, r.engineer_name);
      row.billTotal += Number(r.total);
    }
    for (const r of shipRows) {
      const row = ensure(r.engineer_id, r.engineer_name);
      row.shippingTotal += Number(r.total);
    }

    const results = Object.values(byEngineer).map((row) => ({
      ...row,
      grandTotal: row.advanceTotal + row.billTotal + row.shippingTotal,
    })).sort((a, b) => a.engineerName.localeCompare(b.engineerName));

    return NextResponse.json({ rows: results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
