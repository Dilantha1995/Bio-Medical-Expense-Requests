import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function PATCH(req, { params }) {
  try {
    await requireRole("admin");
    const body = await req.json();
    const { sortOrder, active } = body;

    const sets = [];
    const values = [];
    let i = 1;
    if (sortOrder !== undefined) { sets.push(`sort_order=$${i++}`); values.push(sortOrder); }
    if (typeof active === "boolean") { sets.push(`active=$${i++}`); values.push(active); }

    if (sets.length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

    values.push(params.id);
    const { rows } = await query(`UPDATE designation_options SET ${sets.join(", ")} WHERE id=$${i} RETURNING *`, values);
    if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ option: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to update designation." }, { status: e.status || 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await requireRole("admin");
    await query(`UPDATE designation_options SET active=false WHERE id=$1`, [params.id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to delete designation." }, { status: e.status || 500 });
  }
}
