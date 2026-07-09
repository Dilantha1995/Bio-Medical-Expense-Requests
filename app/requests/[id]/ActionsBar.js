"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resizeImageFile } from "@/lib/imageResize";

export default function ActionsBar({ id, kind, status, session, returnedAt, paymentStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showReturnPicker, setShowReturnPicker] = useState(false);
  const [returnDate, setReturnDate] = useState(returnedAt ? returnedAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [showDeleteBox, setShowDeleteBox] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [showRejectPaymentBox, setShowRejectPaymentBox] = useState(false);
  const [rejectPaymentReason, setRejectPaymentReason] = useState("");
  const slipInputRef = useRef(null);

  const canCheck = ["approver", "admin"].includes(session.role) && status === "submitted";
  const canApprove = (session.canFinalApprove || session.role === "admin") && status === "checked";
  const canReject = ["approver", "admin"].includes(session.role) && ["submitted", "checked"].includes(status);
  const canMarkReturned = kind === "requests" && ["approver", "admin"].includes(session.role) && status === "approved";
  const canDelete = session.role === "admin" && status !== "deleted";
  const canProcessPayment = (session.role === "admin" || session.canProcessPayments) && status === "approved";
  const paymentIsFinal = paymentStatus === "processed";

  async function doAction(action, extra) {
    setBusy(true);
    setError("");
    let reason;
    if (action === "reject") {
      reason = window.prompt("Reason for rejection:");
      if (!reason) { setBusy(false); return; }
    }
    const res = await fetch(`/api/${kind}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason, ...extra }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Action failed.");
      return;
    }
    setShowReturnPicker(false);
    setShowDeleteBox(false);
    setShowRejectPaymentBox(false);
    router.refresh();
  }

  function confirmMarkReturned() {
    doAction("mark_returned", { returnedAt: returnDate });
  }

  function confirmDelete() {
    if (!deleteReason.trim()) { setError("A reason is required."); return; }
    doAction("delete", { reason: deleteReason.trim() });
  }

  function confirmRejectPayment() {
    if (!rejectPaymentReason.trim()) { setError("A reason is required."); return; }
    doAction("reject_payment", { reason: rejectPaymentReason.trim() });
  }

  async function handleSlipUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const resized = await resizeImageFile(file, 800, 0.85);
      await doAction("mark_payment_processed", { paymentSlipData: resized });
    } catch {
      setError("Failed to process the image.");
      setBusy(false);
    }
  }

  return (
    <div className="w-full sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        {error && <span className="text-xs text-red-600 w-full sm:w-auto">{error}</span>}
        {canCheck && (
          <button onClick={() => doAction("check")} disabled={busy}
            className="text-sm bg-blue-600 text-white px-3 py-2 sm:py-1.5 rounded-md disabled:opacity-50">
            Mark Checked
          </button>
        )}
        {canApprove && (
          <button onClick={() => doAction("approve")} disabled={busy}
            className="text-sm bg-green-600 text-white px-3 py-2 sm:py-1.5 rounded-md disabled:opacity-50">
            Approve
          </button>
        )}
        {canReject && (
          <button onClick={() => doAction("reject")} disabled={busy}
            className="text-sm bg-red-600 text-white px-3 py-2 sm:py-1.5 rounded-md disabled:opacity-50">
            Reject
          </button>
        )}
        {canMarkReturned && !showReturnPicker && (
          <button onClick={() => setShowReturnPicker(true)} disabled={busy}
            className="text-sm bg-amber-600 text-white px-3 py-2 sm:py-1.5 rounded-md disabled:opacity-50">
            {returnedAt ? "Update Return Date" : "Mark Returned"}
          </button>
        )}
        {canProcessPayment && !paymentIsFinal && paymentStatus !== "processing" && (
          <button onClick={() => doAction("start_payment")} disabled={busy}
            className="text-sm bg-purple-600 text-white px-3 py-2 sm:py-1.5 rounded-md disabled:opacity-50">
            {paymentStatus === "rejected" ? "Retry Payment Processing" : "Start Payment Processing"}
          </button>
        )}
        {canProcessPayment && paymentStatus === "processing" && (
          <>
            <button onClick={() => slipInputRef.current?.click()} disabled={busy}
              className="text-sm bg-purple-600 text-white px-3 py-2 sm:py-1.5 rounded-md disabled:opacity-50">
              {busy ? "Uploading..." : "Mark Processed & Attach Slip"}
            </button>
            <input ref={slipInputRef} type="file" accept="image/*" className="hidden" onChange={handleSlipUpload} />
            {!showRejectPaymentBox && (
              <button onClick={() => setShowRejectPaymentBox(true)} disabled={busy}
                className="text-sm text-brand-red border border-red-300 px-3 py-2 sm:py-1.5 rounded-md disabled:opacity-50">
                Reject Payment
              </button>
            )}
          </>
        )}
        <a href={`/api/${kind}/${id}/pdf`} target="_blank" rel="noreferrer"
          className="text-sm border border-brand-navy text-brand-navy px-3 py-2 sm:py-1.5 rounded-md">
          Download PDF
        </a>
        <button onClick={() => window.print()} className="text-sm border px-3 py-2 sm:py-1.5 rounded-md">
          Print
        </button>
        {canDelete && !showDeleteBox && (
          <button onClick={() => setShowDeleteBox(true)} disabled={busy}
            className="text-sm text-brand-red border border-red-300 px-3 py-2 sm:py-1.5 rounded-md disabled:opacity-50">
            Delete
          </button>
        )}
      </div>

      {canMarkReturned && showReturnPicker && (
        <div className="mt-2 flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-200 rounded-md p-2">
          <label className="text-xs text-amber-800">Return date:</label>
          <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm" />
          <button onClick={confirmMarkReturned} disabled={busy}
            className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded-md disabled:opacity-50">
            {busy ? "Saving..." : "Confirm"}
          </button>
          <button onClick={() => setShowReturnPicker(false)} className="text-sm border px-3 py-1.5 rounded-md">
            Cancel
          </button>
        </div>
      )}

      {canProcessPayment && showRejectPaymentBox && (
        <div className="mt-2 flex flex-wrap items-center gap-2 bg-red-50 border border-red-200 rounded-md p-2">
          <label className="text-xs text-red-800">Reason for rejecting payment:</label>
          <input value={rejectPaymentReason} onChange={(e) => setRejectPaymentReason(e.target.value)}
            placeholder="e.g. Incorrect bank details" className="border rounded px-2 py-1.5 text-sm flex-1 min-w-[160px]" />
          <button onClick={confirmRejectPayment} disabled={busy}
            className="text-sm bg-brand-red text-white px-3 py-1.5 rounded-md disabled:opacity-50">
            {busy ? "Saving..." : "Confirm Reject"}
          </button>
          <button onClick={() => setShowRejectPaymentBox(false)} className="text-sm border px-3 py-1.5 rounded-md">
            Cancel
          </button>
        </div>
      )}

      {canDelete && showDeleteBox && (
        <div className="mt-2 flex flex-wrap items-center gap-2 bg-red-50 border border-red-200 rounded-md p-2">
          <label className="text-xs text-red-800">Reason for deletion:</label>
          <input value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="e.g. Duplicate entry" className="border rounded px-2 py-1.5 text-sm flex-1 min-w-[160px]" />
          <button onClick={confirmDelete} disabled={busy}
            className="text-sm bg-brand-red text-white px-3 py-1.5 rounded-md disabled:opacity-50">
            {busy ? "Deleting..." : "Confirm Delete"}
          </button>
          <button onClick={() => setShowDeleteBox(false)} className="text-sm border px-3 py-1.5 rounded-md">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
