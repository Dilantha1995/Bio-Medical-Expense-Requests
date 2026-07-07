import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function PATCH(req, { params }) {
  try {
    await requireRole("admin");
    const body = await req.json();
    const { fieldKey, operator, compareValue, color, textColor, label, applyTo, priority, active } = body;

    const sets = [];
    const values = [];
    let i = 1;
    if (fieldKey !== undefined) { sets.push(`field_key=$${i++}`); values.push(fieldKey); }
    if (operator !== undefined) { sets.push(`operator=$${i++}`); values.push(operator); }
    if (compareValue !== undefined) { sets.push(`compare_value=$${i++}`); values.push(compareValue); }
    if (color !== undefined) { sets.push(`color=$${i++}`); values.push(color); }
    if (textColor !== undefined) { sets.push(`text_color=$${i++}`); values.push(textColor); }
    if (label !== undefined) { sets.push(`label=$${i++}`); values.push(label); }
    if (applyTo !== undefined) { sets.push(`apply_to=$${i++}`); values.push(applyTo); }
    if (priority !== undefined) { sets.push(`priority=$${i++}`); values.push(priority); }
    if (typeof active === "boolean") { sets.push(`active=$${i++}`); values.push(active); }

    if (sets.length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

    values.push(params.id);
    const { rows } = await query(`UPDATE pm_conditional_rules SET ${sets.join(", ")} WHERE id=$${i} RETURNING *`, values);
    if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ rule: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to update rule." }, { status: e.status || 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await requireRole("admin");
    await query(`DELETE FROM pm_conditional_rules WHERE id=$1`, [params.id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to delete rule." }, { status: e.status || 500 });
  }
}
