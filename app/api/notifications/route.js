import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSession();
    const { rows } = await query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [session.id]
    );
    const unreadCount = rows.filter((r) => !r.read).length;
    return NextResponse.json({ notifications: rows, unreadCount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
