import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession, requireCanManageConfig } from "@/lib/auth";

// Lists that anyone filling in a form is allowed to extend inline via a
// "+ Add new..." option (SelectWithAdd component). Everything else (e.g.
// travel_advance_type) is curated centrally by an admin from Configure.
const OPEN_ADD_LIST_KEYS = new Set([
  "machine_name",
  "machine_model",
  "machine_category",
  "machine_facility",
  "shipping_expense_type",
]);

export async function GET(req, { params }) {
  try {
    await requireSession();
    const { rows } = await query(
      `SELECT * FROM option_lists WHERE list_key=$1 AND active=true ORDER BY sort_order ASC, id ASC`,
      [params.listKey]
    );
    return NextResponse.json({ options: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req, { params }) {
  let label = "";
  try {
    if (OPEN_ADD_LIST_KEYS.has(params.listKey)) {
      await requireSession();
    } else {
      await requireCanManageConfig();
    }
    ({ label } = await req.json());
    if (!label || !label.trim()) {
      return NextResponse.json({ error: "Label is required." }, { status: 400 });
    }
    const maxOrder = await query(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM option_lists WHERE list_key=$1`, [params.listKey]);
    const sortOrder = maxOrder.rows[0].m + 1;

    const { rows } = await query(
      `INSERT INTO option_lists (list_key, label, sort_order) VALUES ($1,$2,$3) RETURNING *`,
      [params.listKey, label.trim(), sortOrder]
    );
    return NextResponse.json({ option: rows[0] });
  } catch (e) {
    if (e.code === "23505") {
      const { rows } = await query(
        `SELECT * FROM option_lists WHERE list_key=$1 AND lower(label)=lower($2)`,
        [params.listKey, label.trim()]
      );
      return NextResponse.json({ error: "That option already exists.", option: rows[0] || null }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to add option." }, { status: e.status || 500 });
  }
}
