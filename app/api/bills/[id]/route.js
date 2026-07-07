import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getBillSummaryById as fetchBill } from "@/lib/data";

export async function GET(req, { params }) {
  try {
    const session = await requireSession();
    const record = await fetchBill(params.id);
    if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (session.role === "engineer" && record.engineer_id !== session.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return NextResponse.json({ bill: record });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const session = await requireSession();
    const { action, reason } = await req.json();

    if (!["approver", "admin"].includes(session.role)) {
      return NextResponse.json({ error: "Only approvers can perform this action." }, { status: 403 });
    }

    const record = await fetchBill(params.id);
    if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });

    if (action === "check") {
      if (record.status !== "submitted") {
        return NextResponse.json({ error: "This bill summary has already been checked." }, { status: 400 });
      }
      await query(
        `UPDATE bill_summaries SET status='checked', checked_by=$1, checked_at=now() WHERE id=$2`,
        [session.id, params.id]
      );
    } else if (action === "approve") {
      if (!session.canFinalApprove && session.role !== "admin") {
        return NextResponse.json({ error: "You are not authorized to give final approval." }, { status: 403 });
      }
      if (record.status !== "checked") {
        return NextResponse.json({ error: "This bill summary must be checked before it can be approved." }, { status: 400 });
      }
      await query(
        `UPDATE bill_summaries SET status='approved', approved_by=$1, approved_at=now() WHERE id=$2`,
        [session.id, params.id]
      );
    } else if (action === "reject") {
      await query(
        `UPDATE bill_summaries SET status='rejected', rejection_reason=$1 WHERE id=$2`,
        [reason || "No reason given.", params.id]
      );
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const updated = await fetchBill(params.id);
    return NextResponse.json({ bill: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
