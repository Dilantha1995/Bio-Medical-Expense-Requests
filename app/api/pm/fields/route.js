import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePmAccess, requireRole } from "@/lib/auth";

function slugify(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
}

export async function GET() {
  try {
    await requirePmAccess();
    const { rows } = await query(`SELECT * FROM pm_schedule_fields ORDER BY sort_order ASC, id ASC`);
    return NextResponse.json({ fields: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    await requireRole("admin");
    const body = await req.json();
    const { label, fieldType, options } = body;

    if (!label || !fieldType) {
      return NextResponse.json({ error: "Label and field type are required." }, { status: 400 });
    }
    if (!["text", "number", "date", "select", "user"].includes(fieldType)) {
      return NextResponse.json({ error: "Invalid field type." }, { status: 400 });
    }

    let key = slugify(label);
    if (!key) key = "field";
    // Ensure uniqueness by appending a counter if needed.
    const existing = await query(`SELECT key FROM pm_schedule_fields WHERE key LIKE $1`, [`${key}%`]);
    if (existing.rows.some((r) => r.key === key)) {
      let n = 2;
      while (existing.rows.some((r) => r.key === `${key}_${n}`)) n++;
      key = `${key}_${n}`;
    }

    const maxOrder = await query(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM pm_schedule_fields`);
    const sortOrder = maxOrder.rows[0].m + 1;

    const { rows } = await query(
      `INSERT INTO pm_schedule_fields (key, label, field_type, options, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [key, label, fieldType, fieldType === "select" ? JSON.stringify(options || []) : null, sortOrder]
    );
    return NextResponse.json({ field: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to create field." }, { status: e.status || 500 });
  }
}
