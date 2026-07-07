import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession, requireMachineManager } from "@/lib/auth";

export async function GET(req) {
  try {
    await requireSession(); // any logged-in user can view the machine list
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q");

    let sql = `SELECT m.*, u.full_name AS created_by_name FROM machines m LEFT JOIN users u ON u.id = m.created_by`;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` WHERE m.name ILIKE $1 OR m.serial_number ILIKE $1 OR m.facility_name ILIKE $1 OR m.location_label ILIKE $1`;
    }
    sql += " ORDER BY m.created_at DESC LIMIT 500";

    const { rows } = await query(sql, params);
    return NextResponse.json({ machines: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    const session = await requireMachineManager();
    const body = await req.json();
    const { name, model, serialNumber, category, facilityName, locationLabel, installDate, notes } = body;

    if (!name || !serialNumber) {
      return NextResponse.json({ error: "Machine name and serial number are required." }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO machines (name, model, serial_number, category, facility_name, location_label, install_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [name, model || null, serialNumber.trim(), category || null, facilityName || null, locationLabel || null,
        installDate || null, notes || null, session.id]
    );
    return NextResponse.json({ machine: rows[0] });
  } catch (e) {
    if (e.code === "23505") {
      return NextResponse.json({ error: "A machine with that serial number already exists." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to create machine." }, { status: e.status || 500 });
  }
}
