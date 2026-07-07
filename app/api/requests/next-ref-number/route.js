import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { peekNextRefNumber } from "@/lib/refnumber";

export async function GET() {
  try {
    const session = await requireSession();
    const refNumber = await peekNextRefNumber("ADV", session.initials);
    return NextResponse.json({ refNumber });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
