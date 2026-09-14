import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";

// Flattens each travel leg (line item) into its own row so it can answer
// "PM log for island X / brand Y / analyzer Z", "Installation log",
// "Training log" — all the same query with different filters.
export async function GET(req) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const requestType = searchParams.get("requestType");
    const island = searchParams.get("island");
    const machineCategory = searchParams.get("machineCategory");
    const machineName = searchParams.get("machineName");
    const machineId = searchParams.get("machineId");
    const engineerId = searchParams.get("engineerId");
    const company = searchParams.get("company");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let sql = `
      SELECT ar.id AS request_id, ar.ref_number, ar.request_type, ar.company, ar.status, ar.request_date,
        u.full_name AS engineer_name,
        li->>'fromLocation' AS from_location, li->>'toLocation' AS to_location,
        li->>'fromDate' AS from_date, li->>'toDate' AS to_date,
        (li->>'machineId')::int AS machine_id,
        m.name AS machine_name, m.model AS machine_model, m.category AS machine_category,
        m.serial_number AS machine_serial, m.facility_name AS machine_facility
      FROM advance_requests ar
      JOIN users u ON u.id = ar.engineer_id
      CROSS JOIN LATERAL jsonb_array_elements(ar.line_items) AS li
      LEFT JOIN machines m ON m.id = (li->>'machineId')::int
      WHERE ar.deleted_at IS NULL
    `;
    const params = [];
    const conditions = [];

    if (!session.canViewAllRecords) {
      params.push(session.id);
      conditions.push(`ar.engineer_id = $${params.length}`);
    } else if (engineerId) {
      params.push(engineerId);
      conditions.push(`ar.engineer_id = $${params.length}`);
    }
    if (requestType) {
      params.push(requestType);
      conditions.push(`ar.request_type = $${params.length}`);
    }
    if (island) {
      params.push(`%${island}%`);
      conditions.push(`(li->>'fromLocation' ILIKE $${params.length} OR li->>'toLocation' ILIKE $${params.length})`);
    }
    if (machineCategory) {
      params.push(machineCategory);
      conditions.push(`m.category = $${params.length}`);
    }
    if (machineName) {
      params.push(machineName);
      conditions.push(`m.name = $${params.length}`);
    }
    if (machineId) {
      params.push(machineId);
      conditions.push(`m.id = $${params.length}`);
    }
    if (company) {
      params.push(company);
      conditions.push(`ar.company = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`ar.request_date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`ar.request_date <= $${params.length}`);
    }
    if (conditions.length) sql += " AND " + conditions.join(" AND ");
    sql += " ORDER BY ar.request_date DESC LIMIT 1000";

    const { rows } = await query(sql, params);
    return NextResponse.json({ rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
