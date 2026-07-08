import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth";

const DEFAULTS = {
  timezone: "Indian/Maldives",
  currency: "MVR",
};

export async function GET() {
  try {
    await requireSession();
    const { rows } = await query(`SELECT key, value FROM app_settings`);
    const settings = { ...DEFAULTS };
    rows.forEach((r) => { settings[r.key] = r.value; });
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function PATCH(req) {
  try {
    await requireRole("admin");
    const body = await req.json();
    const entries = Object.entries(body);
    for (const [key, value] of entries) {
      await query(
        `INSERT INTO app_settings (key, value) VALUES ($1,$2)
         ON CONFLICT (key) DO UPDATE SET value=$2`,
        [key, String(value)]
      );
    }
    const { rows } = await query(`SELECT key, value FROM app_settings`);
    const settings = { ...DEFAULTS };
    rows.forEach((r) => { settings[r.key] = r.value; });
    return NextResponse.json({ settings });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to update settings." }, { status: e.status || 500 });
  }
}
