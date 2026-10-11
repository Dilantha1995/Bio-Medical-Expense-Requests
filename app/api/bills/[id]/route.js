import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getBillSummaryById as fetchBill } from "@/lib/data";
import { billGrandTotal } from "@/lib/billCalc";
import { notify, notifyMany, getFinalApproverIds, getCheckerIds } from "@/lib/notifications";

export async function GET(req, { params }) {
  try {
    const session = await requireSession();
    const record = await fetchBill(params.id);
    if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!session.canViewAllRecords && record.engineer_id !== session.id) {
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
    const body = await req.json();
    const { action, reason, paymentSlipData } = body;
    const link = `/bills/${params.id}`;

    // Save draft edits or perform the explicit final submission. Drafts never
    // enter the approval workflow until final_submit is requested.
    if (action === "save_changes" || action === "final_submit") {
      const record = await fetchBill(params.id);
      if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
      const isAdmin = session.role === "admin";
      const isOwner = Number(record.engineer_id) === Number(session.id);

      if (action === "save_changes") {
        if (record.status === "draft" ? (!isOwner && !isAdmin) : !isAdmin) {
          return NextResponse.json({ error: "Only the owner can edit a draft; after final submission, only admins can edit." }, { status: 403 });
        }

        const {
          summaryDate, destinationLabel, purposeOfTravel, notes, lineItems,
          advanceRequestId, advanceReceived, company,
        } = body;

        if (!Array.isArray(lineItems)) {
          return NextResponse.json({ error: "Bill line items are required." }, { status: 400 });
        }
        const companyValue = ["PSMS", "PPM"].includes(company) ? company : record.company || "PSMS";
        if (advanceRequestId) {
          const owner = await query(
            `SELECT engineer_id FROM advance_requests WHERE id=$1 AND engineer_id=$2`,
            [advanceRequestId, record.engineer_id]
          );
          if (!owner.rows[0]) {
            return NextResponse.json({ error: "The linked advance request must belong to the bill summary owner." }, { status: 403 });
          }
        }

        const total = billGrandTotal(lineItems);
        const advReceived = parseFloat(advanceReceived) || 0;
        const balance = total - advReceived;
        await query(
          `UPDATE bill_summaries
           SET summary_date=$1, destination_label=$2, purpose_of_travel=$3, notes=$4,
               line_items=$5, total_amount=$6, advance_request_id=$7, advance_received=$8,
               balance_due=$9, company=$10
           WHERE id=$11`,
          [
            summaryDate || record.summary_date, destinationLabel || "", purposeOfTravel || "", notes || "",
            JSON.stringify(lineItems), total, advanceRequestId || null, advReceived, balance, companyValue, params.id,
          ]
        );
        return NextResponse.json({ bill: await fetchBill(params.id) });
      }

      if (record.status !== "draft") {
        return NextResponse.json({ error: "This bill summary has already been finally submitted." }, { status: 400 });
      }
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Only the bill summary owner or an admin can submit it." }, { status: 403 });
      }
      const items = Array.isArray(record.line_items) ? record.line_items : [];
      const hasExpense = items.some((item) =>
        (parseFloat(item.food) || 0) > 0 ||
        (parseFloat(item.accommodation) || 0) > 0 ||
        (parseFloat(item.airfare) || 0) > 0 ||
        (parseFloat(item.taxiFerry) || 0) > 0 ||
        (parseFloat(item.seaTransport) || 0) > 0 ||
        (parseFloat(item.landTransport) || 0) > 0 ||
        (parseFloat(item.others) || 0) > 0 ||
        (parseFloat(item.amount) || 0) > 0 ||
        Boolean((item.description || "").trim() || (item.supplierName || "").trim() || (item.billNo || "").trim())
      );
      if (!record.summary_date || !hasExpense) {
        return NextResponse.json({ error: "Before final submission, please enter at least one bill description or expense amount." }, { status: 400 });
      }

      const submitted = await query(
        `UPDATE bill_summaries
         SET status='submitted', final_submitted_at=now(), prepared_by=$1, prepared_at=now()
         WHERE id=$2 AND status='draft'
         RETURNING id`,
        [session.id, params.id]
      );
      if (!submitted.rows[0]) {
        return NextResponse.json({ error: "This bill summary has already been submitted." }, { status: 409 });
      }
      const checkerIds = await getCheckerIds();
      await notifyMany(
        checkerIds,
        "New bill summary submitted",
        `${record.ref_number} (${record.engineer_name || session.fullName}) needs checking.`,
        link
      );
      return NextResponse.json({ bill: await fetchBill(params.id) });
    }

    if (action === "delete") {
      if (!session.canDeleteRecords) {
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

    if (action === "start_payment" || action === "mark_payment_processed" || action === "reject_payment") {
      if (!session.canProcessPayments) {
        return NextResponse.json({ error: "You're not authorized to process payments." }, { status: 403 });
      }
      const before = await fetchBill(params.id);
      if (!before) return NextResponse.json({ error: "Not found." }, { status: 404 });
      if (before.status !== "approved") {
        return NextResponse.json({ error: "Only approved bill summaries can enter payment processing." }, { status: 400 });
      }
      if (before.payment_status === "processed") {
        return NextResponse.json({ error: "This payment has already been processed." }, { status: 400 });
      }

      if (action === "start_payment") {
        await query(`UPDATE bill_summaries SET payment_status='processing', payment_rejection_reason=NULL WHERE id=$1`, [params.id]);
        await notify(before.engineer_id, "Payment processing started", `Payment for ${before.ref_number} is now being processed.`, link);
      } else if (action === "reject_payment") {
        if (!reason || !reason.trim()) {
          return NextResponse.json({ error: "A reason is required to reject a payment." }, { status: 400 });
        }
        await query(
          `UPDATE bill_summaries SET payment_status='rejected', payment_rejection_reason=$1 WHERE id=$2`,
          [reason.trim(), params.id]
        );
        await notify(before.engineer_id, "Payment rejected", `Payment for ${before.ref_number} was rejected by ${session.fullName}. Reason: ${reason.trim()}`, link);
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

    if (!session.canCheck) {
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
      if (!session.canFinalApprove) {
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
