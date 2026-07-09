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
    if (e.status) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    // Table not migrated yet, or some other transient DB issue — don't
    // break the whole page over a notification bell.
    console.error("notifications GET failed (fail-open):", e.message);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}
