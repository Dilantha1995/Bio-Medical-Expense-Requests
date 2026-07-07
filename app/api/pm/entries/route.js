import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePmAccess } from "@/lib/auth";

export async function GET() {
  try {
    await requirePmAccess();
    const { rows } = await query(`
      SELECT e.*, m.name AS machine_name, m.serial_number, m.facility_name, m.location_label
      FROM pm_schedule_entries e
      JOIN machines m ON m.id = e.machine_id
      ORDER BY e.created_at DESC
      LIMIT 1000
    `);
    return NextResponse.json({ entries: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    const session = await requirePmAccess();
    const body = await req.json();
    const { machineId, values } = body;

    if (!machineId) return NextResponse.json({ error: "Machine is required." }, { status: 400 });

    const { rows } = await query(
      `INSERT INTO pm_schedule_entries (machine_id, field_values, created_by) VALUES ($1,$2,$3) RETURNING *`,
      [machineId, JSON.stringify(values || {}), session.id]
    );
    return NextResponse.json({ entry: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to create entry." }, { status: e.status || 500 });
  }
}
