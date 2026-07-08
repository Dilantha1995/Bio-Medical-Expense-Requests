import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getBillSummaryById as fetchBill } from "@/lib/data";
import { notify, notifyMany, getFinalApproverIds } from "@/lib/notifications";

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
    const { action, reason, paymentSlipData } = await req.json();
    const link = `/bills/${params.id}`;

    if (action === "delete") {
      if (session.role !== "admin") {
        return NextResponse.json({ error: "Only admins can delete entries." }, { status: 403 });
      }
      if (!reason || !reason.trim()) {
        return NextResponse.json({ error: "A reason is required to delete an entry." }, { status: 400 });
      }
      const before = await fetchBill(params.id);
      if (!before) return NextResponse.json({ error: "Not found." }, { status: 404 });
      await query(
        `UPDATE bill_summaries SET deleted_at=now(), deleted_by=$1, deletion_reason=$2 WHERE id=$3`,
        [session.id, reason.trim(), params.id]
      );
      const updated = await fetchBill(params.id);
      await notify(before.engineer_id, "Bill summary deleted", `${before.ref_number} was deleted by ${session.fullName}. Reason: ${reason.trim()}`, link);
      return NextResponse.json({ bill: updated });
    }

    if (action === "start_payment" || action === "mark_payment_processed") {
      if (session.role !== "admin" && !session.canProcessPayments) {
        return NextResponse.json({ error: "You're not authorized to process payments." }, { status: 403 });
      }
      const before = await fetchBill(params.id);
      if (!before) return NextResponse.json({ error: "Not found." }, { status: 404 });
      if (before.status !== "approved") {
        return NextResponse.json({ error: "Only approved bill summaries can enter payment processing." }, { status: 400 });
      }

      if (action === "start_payment") {
        await query(`UPDATE bill_summaries SET payment_status='processing' WHERE id=$1`, [params.id]);
        await notify(before.engineer_id, "Payment processing started", `Payment for ${before.ref_number} is now being processed.`, link);
      } else {
        if (!paymentSlipData) {
          return NextResponse.json({ error: "Please attach the payment slip." }, { status: 400 });
        }
        await query(
          `UPDATE bill_summaries SET payment_status='processed', payment_slip_data=$1, payment_processed_by=$2, payment_processed_at=now() WHERE id=$3`,
          [paymentSlipData, session.id, params.id]
        );
        await notify(before.engineer_id, "Payment processed", `Payment for ${before.ref_number} has been processed. The payment slip is attached to the document.`, link);
      }
      const updated = await fetchBill(params.id);
      return NextResponse.json({ bill: updated });
    }

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
      await notify(record.engineer_id, "Bill summary checked", `${record.ref_number} has been checked and is awaiting final approval.`, link);
      const approverIds = await getFinalApproverIds();
      await notifyMany(approverIds, "Approval needed", `${record.ref_number} (${record.engineer_name}) is ready for your approval.`, link);
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
      await notify(record.engineer_id, "Bill summary approved", `${record.ref_number} has been approved.`, link);
    } else if (action === "reject") {
      await query(
        `UPDATE bill_summaries SET status='rejected', rejection_reason=$1 WHERE id=$2`,
        [reason || "No reason given.", params.id]
      );
      await notify(record.engineer_id, "Bill summary rejected", `${record.ref_number} was rejected. Reason: ${reason || "No reason given."}`, link);
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
