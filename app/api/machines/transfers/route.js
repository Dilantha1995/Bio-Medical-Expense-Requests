import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(req) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get("machineId");

    let sql = `SELECT mt.*, m.name AS machine_name, m.serial_number AS machine_serial_number
               FROM machine_transfers mt JOIN machines m ON m.id = mt.machine_id`;
    const params = [];
    if (machineId) {
      params.push(machineId);
      sql += ` WHERE mt.machine_id = $1`;
    }
    sql += ` ORDER BY mt.created_at DESC LIMIT 500`;

    const { rows } = await query(sql, params);
    return NextResponse.json({ transfers: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
