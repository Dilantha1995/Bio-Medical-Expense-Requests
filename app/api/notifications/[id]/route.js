import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function PATCH(req, { params }) {
  try {
    const session = await requireSession();
    await query(`UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2`, [params.id, session.id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
