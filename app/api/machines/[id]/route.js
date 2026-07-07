import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession, requireMachineManager } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await requireSession();
    const { rows } = await query("SELECT * FROM machines WHERE id=$1", [params.id]);
    if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ machine: rows[0] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    await requireMachineManager();
    const body = await req.json();
    const { name, model, category, facilityName, locationLabel, installDate, notes } = body;

    const sets = [];
    const values = [];
    let i = 1;
    if (name !== undefined) { sets.push(`name=$${i++}`); values.push(name); }
    if (model !== undefined) { sets.push(`model=$${i++}`); values.push(model); }
    if (category !== undefined) { sets.push(`category=$${i++}`); values.push(category); }
    if (facilityName !== undefined) { sets.push(`facility_name=$${i++}`); values.push(facilityName); }
    if (locationLabel !== undefined) { sets.push(`location_label=$${i++}`); values.push(locationLabel); }
    if (installDate !== undefined) { sets.push(`install_date=$${i++}`); values.push(installDate || null); }
    if (notes !== undefined) { sets.push(`notes=$${i++}`); values.push(notes); }

    if (sets.length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

    values.push(params.id);
    const { rows } = await query(`UPDATE machines SET ${sets.join(", ")} WHERE id=$${i} RETURNING *`, values);
    if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ machine: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to update machine." }, { status: e.status || 500 });
  }
}
