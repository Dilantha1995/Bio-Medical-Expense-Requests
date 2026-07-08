import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession, verifyPassword, hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    const session = await requireSession();
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
    }

    const { rows } = await query(`SELECT * FROM users WHERE id=$1`, [session.id]);
    const user = rows[0];
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const ok = await verifyPassword(currentPassword, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const hash = await hashPassword(newPassword);
    const { rows: updated } = await query(
      `UPDATE users SET password_hash=$1, must_change_password=false WHERE id=$2 RETURNING *`,
      [hash, session.id]
    );

    // Reissue the session so the mustChangePassword flag clears immediately
    // (JWTs are stateless — the old token would still say "must change").
    const token = await createSessionToken(updated[0]);
    await setSessionCookie(token);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to change password." }, { status: e.status || 500 });
  }
}
