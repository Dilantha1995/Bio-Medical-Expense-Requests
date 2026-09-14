import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getAdvanceRequestById as fetchRequest } from "@/lib/data";
import { notify, notifyMany, getFinalApproverIds, getCheckerIds } from "@/lib/notifications";
import { grandTotal } from "@/lib/calc";

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
    const { action, reason, returnedAt, paymentSlipData, newEndDate, extraLineItems } = await req.json();
    const link = `/requests/${params.id}`;

    if (action === "mark_returned") {
      if (!["approver", "admin"].includes(session.role)) {
        return NextResponse.json({ error: "Only approvers/supervisors can mark an engineer as returned." }, { status: 403 });
      }
      const before = await fetchRequest(params.id);
      await query(
        `UPDATE advance_requests SET returned_at=$1, returned_marked_by=$2, returned_marked_at=now() WHERE id=$3`,
        [returnedAt || new Date().toISOString().slice(0, 10), session.id, params.id]
      );
      const updated = await fetchRequest(params.id);
      await notify(before.engineer_id, "Return date recorded", `Your return date for ${updated.ref_number} was recorded as ${returnedAt}. Your bill summary is due within 3 working days.`, link);
      return NextResponse.json({ request: updated });
    }

    if (action === "delete") {
      if (session.role !== "admin") {
        return NextResponse.json({ error: "Only admins can delete entries." }, { status: 403 });
      }
      if (!reason || !reason.trim()) {
        return NextResponse.json({ error: "A reason is required to delete an entry." }, { status: 400 });
      }
      const before = await fetchRequest(params.id);
      if (!before) return NextResponse.json({ error: "Not found." }, { status: 404 });
      await query(
        `UPDATE advance_requests SET deleted_at=now(), deleted_by=$1, deletion_reason=$2 WHERE id=$3`,
        [session.id, reason.trim(), params.id]
      );
      const updated = await fetchRequest(params.id);
      await notify(before.engineer_id, "Advance request deleted", `${before.ref_number} was deleted by ${session.fullName}. Reason: ${reason.trim()}`, link);
      return NextResponse.json({ request: updated });
    }

    if (action === "start_payment" || action === "mark_payment_processed" || action === "reject_payment") {
      if (session.role !== "admin" && !session.canProcessPayments) {
        return NextResponse.json({ error: "You're not authorized to process payments." }, { status: 403 });
      }
      const before = await fetchRequest(params.id);
      if (!before) return NextResponse.json({ error: "Not found." }, { status: 404 });
      if (before.status !== "approved") {
        return NextResponse.json({ error: "Only approved requests can enter payment processing." }, { status: 400 });
      }
      if (before.payment_status === "processed") {
        return NextResponse.json({ error: "This payment has already been processed." }, { status: 400 });
      }

      if (action === "start_payment") {
        await query(`UPDATE advance_requests SET payment_status='processing', payment_rejection_reason=NULL WHERE id=$1`, [params.id]);
        await notify(before.engineer_id, "Payment processing started", `Payment for ${before.ref_number} is now being processed.`, link);
      } else if (action === "reject_payment") {
        if (!reason || !reason.trim()) {
          return NextResponse.json({ error: "A reason is required to reject a payment." }, { status: 400 });
        }
        await query(
          `UPDATE advance_requests SET payment_status='rejected', payment_rejection_reason=$1 WHERE id=$2`,
          [reason.trim(), params.id]
        );
        await notify(before.engineer_id, "Payment rejected", `Payment for ${before.ref_number} was rejected by ${session.fullName}. Reason: ${reason.trim()}`, link);
      } else {
        if (!paymentSlipData) {
          return NextResponse.json({ error: "Please attach the payment slip." }, { status: 400 });
        }
        await query(
          `UPDATE advance_requests SET payment_status='processed', payment_slip_data=$1, payment_processed_by=$2, payment_processed_at=now() WHERE id=$3`,
          [paymentSlipData, session.id, params.id]
        );
        await notify(before.engineer_id, "Payment processed", `Payment for ${before.ref_number} has been processed. The payment slip is attached to the document.`, link);
      }
      const updated = await fetchRequest(params.id);
      return NextResponse.json({ request: updated });
    }

    if (action === "mark_task_completed") {
      const before = await fetchRequest(params.id);
      if (!before) return NextResponse.json({ error: "Not found." }, { status: 404 });
      const isOwner = before.engineer_id === session.id;
      if (!isOwner && !["approver", "admin"].includes(session.role)) {
        return NextResponse.json({ error: "You're not authorized to mark this task completed." }, { status: 403 });
      }
      if (before.status !== "approved") {
        return NextResponse.json({ error: "Only an approved request's task can be marked completed." }, { status: 400 });
      }
      if (before.task_completed_at) {
        return NextResponse.json({ error: "This task is already marked completed." }, { status: 400 });
      }
      await query(
        `UPDATE advance_requests SET task_completed_at=now(), task_completed_by=$1 WHERE id=$2`,
        [session.id, params.id]
      );
      const updated = await fetchRequest(params.id);
      return NextResponse.json({ request: updated });
    }

    if (action === "request_extension") {
      const before = await fetchRequest(params.id);
      if (!before) return NextResponse.json({ error: "Not found." }, { status: 404 });
      const isOwner = before.engineer_id === session.id;
      if (!isOwner && session.role !== "admin") {
        return NextResponse.json({ error: "Only the engineer who submitted this request (or an admin) can request an extension." }, { status: 403 });
      }
      if (before.status !== "approved") {
        return NextResponse.json({ error: "Only an approved request can be extended." }, { status: 400 });
      }
      if (before.task_completed_at) {
        return NextResponse.json({ error: "This task is already marked completed." }, { status: 400 });
      }
      if (before.is_extension_pending) {
        return NextResponse.json({ error: "An extension is already pending review for this request." }, { status: 400 });
      }
      if (!newEndDate || !reason || !reason.trim()) {
        return NextResponse.json({ error: "A new end date and a reason are required." }, { status: 400 });
      }
      if (before.expected_end_date && newEndDate <= before.expected_end_date.toISOString().slice(0, 10)) {
        return NextResponse.json({ error: "The new end date must be after the current expected completion date." }, { status: 400 });
      }

      const snapshot = { line_items: before.line_items, total_amount: before.total_amount };
      let lineItems = before.line_items;
      if (Array.isArray(extraLineItems) && extraLineItems.length > 0) {
        lineItems = [...lineItems, ...extraLineItems.map((it) => ({ ...it, isExtension: true }))];
      }
      const total = grandTotal(lineItems);
      const historyEntry = {
        requestedAt: new Date().toISOString(),
        requestedBy: session.id,
        requestedByName: session.fullName,
        previousEndDate: before.expected_end_date,
        newEndDate,
        reason: reason.trim(),
        status: "pending",
      };
      const history = [...(before.extension_history || []), historyEntry];

      await query(
        `UPDATE advance_requests
         SET line_items=$1, total_amount=$2, extension_history=$3, pre_extension_snapshot=$4,
             is_extension_pending=true, status='submitted'
         WHERE id=$5`,
        [JSON.stringify(lineItems), total, JSON.stringify(history), JSON.stringify(snapshot), params.id]
      );

      const checkerIds = await getCheckerIds();
      await notifyMany(checkerIds, "Extension requested", `${before.ref_number} (${session.fullName}) requested an extension to ${newEndDate} and needs re-checking.`, link);

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
      await notify(record.engineer_id, "Advance request checked", `${record.ref_number} has been checked and is awaiting final approval.`, link);
      const approverIds = await getFinalApproverIds();
      await notifyMany(approverIds, "Approval needed", `${record.ref_number} (${record.engineer_name}) is ready for your approval.`, link);
    } else if (action === "approve") {
      if (!session.canFinalApprove && session.role !== "admin") {
        return NextResponse.json({ error: "You are not authorized to give final approval." }, { status: 403 });
      }
      if (record.status !== "checked") {
        return NextResponse.json({ error: "This request must be checked before it can be approved." }, { status: 400 });
      }
      if (record.is_extension_pending) {
        const history = [...(record.extension_history || [])];
        const last = history[history.length - 1];
        if (last && last.status === "pending") {
          last.status = "approved";
          last.approvedBy = session.id;
          last.approvedByName = session.fullName;
          last.approvedAt = new Date().toISOString();
        }
        await query(
          `UPDATE advance_requests
           SET status='approved', approved_by=$1, approved_at=now(), expected_end_date=$2,
               is_extension_pending=false, pre_extension_snapshot=NULL, last_reminder_sent_on=NULL, extension_history=$3
           WHERE id=$4`,
          [session.id, last ? last.newEndDate : record.expected_end_date, JSON.stringify(history), params.id]
        );
      } else {
        await query(
          `UPDATE advance_requests SET status='approved', approved_by=$1, approved_at=now() WHERE id=$2`,
          [session.id, params.id]
        );
      }
      await notify(record.engineer_id, "Advance request approved", `${record.ref_number} has been approved.`, link);
    } else if (action === "reject") {
      if (record.is_extension_pending) {
        const history = [...(record.extension_history || [])];
        const last = history[history.length - 1];
        if (last && last.status === "pending") {
          last.status = "rejected";
          last.rejectionReason = reason || "No reason given.";
          last.rejectedBy = session.id;
          last.rejectedByName = session.fullName;
          last.rejectedAt = new Date().toISOString();
        }
        const snapshot = record.pre_extension_snapshot || { line_items: record.line_items, total_amount: record.total_amount };
        await query(
          `UPDATE advance_requests
           SET status='approved', line_items=$1, total_amount=$2, is_extension_pending=false,
               pre_extension_snapshot=NULL, extension_history=$3
           WHERE id=$4`,
          [JSON.stringify(snapshot.line_items), snapshot.total_amount, JSON.stringify(history), params.id]
        );
        await notify(record.engineer_id, "Extension declined", `Your extension request for ${record.ref_number} was declined. Reason: ${reason || "No reason given."} The original approval and deadline remain in effect.`, link);
        const updated = await fetchRequest(params.id);
        return NextResponse.json({ request: updated });
      }
      await query(
        `UPDATE advance_requests SET status='rejected', rejection_reason=$1 WHERE id=$2`,
        [reason || "No reason given.", params.id]
      );
      await notify(record.engineer_id, "Advance request rejected", `${record.ref_number} was rejected. Reason: ${reason || "No reason given."}`, link);
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
