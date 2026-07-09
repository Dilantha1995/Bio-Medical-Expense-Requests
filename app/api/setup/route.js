import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getPool } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

// One-time setup endpoint. Visit this URL once in your browser after deploying:
//   https://your-app.vercel.app/api/setup?token=YOUR_SETUP_SECRET
//
// It creates the database tables (if they don't exist yet) and one admin
// user so you can log in. Requires a SETUP_SECRET environment variable to
// be set in Vercel, matching the ?token= you pass in — this stops random
// visitors from calling it. Safe to visit more than once: it won't
// recreate the admin user if one with the same username already exists.

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const forceReset = searchParams.get("reset") === "true";

    if (!process.env.SETUP_SECRET) {
      return NextResponse.json(
        { error: "SETUP_SECRET is not set in your Vercel environment variables. Add it, then try again." },
        { status: 500 }
      );
    }
    if (!token || token !== process.env.SETUP_SECRET) {
      const expected = process.env.SETUP_SECRET || "";
      const mask = (s) => (s.length <= 4 ? "*".repeat(s.length) : s.slice(0, 2) + "*".repeat(Math.max(0, s.length - 4)) + s.slice(-2));
      return NextResponse.json({
        error: "Invalid or missing token.",
        debug: {
          tokenReceived: token ? mask(token) : "(none)",
          tokenReceivedLength: token ? token.length : 0,
          expectedLength: expected.length,
          expectedMasked: mask(expected),
          matchesAfterTrim: token ? token.trim() === expected.trim() : false,
        },
      }, { status: 403 });
    }

    const pool = getPool();
    const schemaPath = path.join(process.cwd(), "db", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    await pool.query(schema);

    const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
    const fullName = process.env.ADMIN_NAME || "System Admin";

    const existing = await pool.query("SELECT id FROM users WHERE username=$1", [username]);

    if (existing.rows.length > 0) {
      if (!forceReset) {
        return NextResponse.json({
          ok: true,
          message: `Tables are ready. Admin user "${username}" already exists. To reset its password to the current ADMIN_PASSWORD environment variable, visit this URL again with "&reset=true" added to the end.`,
        });
      }
      const hash = await hashPassword(password);
      await pool.query("UPDATE users SET password_hash=$1, active=true WHERE username=$2", [hash, username]);
      return NextResponse.json({
        ok: true,
        message: "Admin password has been reset. Log in with the credentials below, then go to Manage Users to change the password to something only you know.",
        username,
        password,
      });
    }

    const hash = await hashPassword(password);
    await pool.query(
      `INSERT INTO users (username, password_hash, full_name, initials, designation, role, can_final_approve, active)
       VALUES ($1,$2,$3,'AD','Administrator','admin', true, true)`,
      [username, hash, fullName]
    );

    return NextResponse.json({
      ok: true,
      message: "Setup complete. Log in with the credentials below, then go to Manage Users to change the password.",
      username,
      password,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Setup failed." }, { status: 500 });
  }
}
