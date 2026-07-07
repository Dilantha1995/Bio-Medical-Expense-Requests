import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePmAccess } from "@/lib/auth";

export async function GET() {
  try {
    await requirePmAccess();
    const { rows } = await query(
      `SELECT id, full_name, initials FROM users WHERE active=true ORDER BY full_name ASC`
    );
    return NextResponse.json({ users: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
