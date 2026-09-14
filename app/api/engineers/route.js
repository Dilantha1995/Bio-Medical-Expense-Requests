import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireCanViewAllRecords } from "@/lib/auth";

export async function GET() {
  try {
    await requireCanViewAllRecords();
    const { rows } = await query(
      `SELECT id, full_name, initials FROM users WHERE role='engineer' AND active=true ORDER BY full_name ASC`
    );
    return NextResponse.json({ engineers: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
