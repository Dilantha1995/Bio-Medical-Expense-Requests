import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function POST() {
  try {
    const session = await requireSession();
    await query(`UPDATE notifications SET read=true WHERE user_id=$1 AND read=false`, [session.id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
