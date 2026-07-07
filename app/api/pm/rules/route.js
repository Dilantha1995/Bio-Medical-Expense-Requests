import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePmAccess, requireRole } from "@/lib/auth";

export async function GET() {
  try {
    await requirePmAccess();
    const { rows } = await query(`SELECT * FROM pm_conditional_rules ORDER BY priority ASC, id ASC`);
    return NextResponse.json({ rules: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    await requireRole("admin");
    const body = await req.json();
    const { fieldKey, operator, compareValue, color, textColor, label, applyTo, priority } = body;

    if (!fieldKey || !operator || !color) {
      return NextResponse.json({ error: "Field, operator, and color are required." }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO pm_conditional_rules (field_key, operator, compare_value, color, text_color, label, apply_to, priority, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING *`,
      [fieldKey, operator, compareValue ?? null, color, textColor || null, label || null, applyTo || "cell", priority ?? 0]
    );
    return NextResponse.json({ rule: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to create rule." }, { status: e.status || 500 });
  }
}
