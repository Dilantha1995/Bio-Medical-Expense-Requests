import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth";

export async function GET() {
  try {
    await requireSession();
    const { rows } = await query(
      `SELECT * FROM designation_options WHERE active=true ORDER BY sort_order ASC, id ASC`
    );
    return NextResponse.json({ options: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    await requireRole("admin");
    const { label } = await req.json();
    if (!label || !label.trim()) {
      return NextResponse.json({ error: "Label is required." }, { status: 400 });
    }
    const maxOrder = await query(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM designation_options`);
    const sortOrder = maxOrder.rows[0].m + 1;

    const { rows } = await query(
      `INSERT INTO designation_options (label, sort_order) VALUES ($1,$2) RETURNING *`,
      [label.trim(), sortOrder]
    );
    return NextResponse.json({ option: rows[0] });
  } catch (e) {
    if (e.code === "23505") {
      return NextResponse.json({ error: "That designation already exists." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to add designation." }, { status: e.status || 500 });
  }
}
