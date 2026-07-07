import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    const { rows } = await query(
      `SELECT * FROM users WHERE username=$1 AND active=true`,
      [username.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      role: user.role,
      fullName: user.full_name,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: `Login failed: ${e.message}` }, { status: 500 });
  }
}
