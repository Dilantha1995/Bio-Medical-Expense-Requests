import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePmAccess } from "@/lib/auth";

export async function PATCH(req, { params }) {
  try {
    await requirePmAccess();
    const body = await req.json();
    const { values, machineId } = body;

    const sets = [];
    const sqlValues = [];
    let i = 1;
    if (values !== undefined) { sets.push(`field_values=$${i++}`); sqlValues.push(JSON.stringify(values)); }
    if (machineId !== undefined) { sets.push(`machine_id=$${i++}`); sqlValues.push(machineId); }
    sets.push(`updated_at=now()`);

    if (sets.length === 1) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

    sqlValues.push(params.id);
    const { rows } = await query(`UPDATE pm_schedule_entries SET ${sets.join(", ")} WHERE id=$${i} RETURNING *`, sqlValues);
    if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ entry: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to update entry." }, { status: e.status || 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await requirePmAccess();
    await query(`DELETE FROM pm_schedule_entries WHERE id=$1`, [params.id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to delete entry." }, { status: e.status || 500 });
  }
}
