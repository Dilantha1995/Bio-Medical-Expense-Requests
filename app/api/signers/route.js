import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getCheckerUsers, getFinalApproverUsers } from "@/lib/notifications";

export async function GET() {
  try {
    await requireSession();
    const [checkers, approvers] = await Promise.all([getCheckerUsers(), getFinalApproverUsers()]);
    return NextResponse.json({ checkers, approvers });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
