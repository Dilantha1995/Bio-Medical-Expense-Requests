import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getAdvanceRequestById as fetchRequest } from "@/lib/data";

export async function GET(req, { params }) {
  try {
    const session = await requireSession();
    const record = await fetchRequest(params.id);
    if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (session.role === "engineer" && record.engineer_id !== session.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return NextResponse.json({ request: record });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const session = await requireSession();
    const { action, reason, returnedAt } = await req.json(); // action: 'check' | 'approve' | 'reject' | 'mark_returned'

    if (action === "mark_returned") {
      if (!["approver", "admin"].includes(session.role)) {
        return NextResponse.json({ error: "Only approvers/supervisors can mark an engineer as returned." }, { status: 403 });
      }
      await query(
        `UPDATE advance_requests SET returned_at=$1, returned_marked_by=$2, returned_marked_at=now() WHERE id=$3`,
        [returnedAt || new Date().toISOString().slice(0, 10), session.id, params.id]
      );
      const updated = await fetchRequest(params.id);
      return NextResponse.json({ request: updated });
    }

    if (!["approver", "admin"].includes(session.role)) {
      return NextResponse.json({ error: "Only approvers can perform this action." }, { status: 403 });
    }

    const record = await fetchRequest(params.id);
    if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });

    if (action === "check") {
      if (record.status !== "submitted") {
        return NextResponse.json({ error: "This request has already been checked." }, { status: 400 });
      }
      await query(
        `UPDATE advance_requests SET status='checked', checked_by=$1, checked_at=now() WHERE id=$2`,
        [session.id, params.id]
      );
    } else if (action === "approve") {
      if (!session.canFinalApprove && session.role !== "admin") {
        return NextResponse.json({ error: "You are not authorized to give final approval." }, { status: 403 });
      }
      if (record.status !== "checked") {
        return NextResponse.json({ error: "This request must be checked before it can be approved." }, { status: 400 });
      }
      await query(
        `UPDATE advance_requests SET status='approved', approved_by=$1, approved_at=now() WHERE id=$2`,
        [session.id, params.id]
      );
    } else if (action === "reject") {
      await query(
        `UPDATE advance_requests SET status='rejected', rejection_reason=$1 WHERE id=$2`,
        [reason || "No reason given.", params.id]
      );
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const updated = await fetchRequest(params.id);
    return NextResponse.json({ request: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
