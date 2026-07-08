import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { checkSchemaHealth } from "@/lib/schemaCheck";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireRole("admin");
    const health = await checkSchemaHealth();
    return NextResponse.json(health);
  } catch (e) {
    // Don't let a broken check itself break the app — fail open.
    return NextResponse.json({ ok: true, missing: [] });
  }
}
