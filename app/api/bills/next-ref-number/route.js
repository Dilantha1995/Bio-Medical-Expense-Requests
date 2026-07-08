import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { peekNextRefNumber } from "@/lib/refnumber";

export async function GET(req) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company") || "PSMS";
    const refNumber = await peekNextRefNumber("BM", session.initials, company);
    return NextResponse.json({ refNumber });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
