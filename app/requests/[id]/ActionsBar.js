"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActionsBar({ id, kind, status, session, returnedAt }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showReturnPicker, setShowReturnPicker] = useState(false);
  const [returnDate, setReturnDate] = useState(returnedAt ? returnedAt.slice(0, 10) : new Date().toISOString().slice(0, 10));

  const canCheck = ["approver", "admin"].includes(session.role) && status === "submitted";
  const canApprove = (session.canFinalApprove || session.role === "admin") && status === "checked";
  const canReject = ["approver", "admin"].includes(session.role) && ["submitted", "checked"].includes(status);
  const canMarkReturned = kind === "requests" && ["approver", "admin"].includes(session.role) && status === "approved";

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
    router.refresh();
  }

  function confirmMarkReturned() {
    doAction("mark_returned", { returnedAt: returnDate });
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
        <a href={`/api/${kind}/${id}/pdf`} target="_blank" rel="noreferrer"
          className="text-sm border border-brand-navy text-brand-navy px-3 py-2 sm:py-1.5 rounded-md">
          Download PDF
        </a>
        <button onClick={() => window.print()} className="text-sm border px-3 py-2 sm:py-1.5 rounded-md">
          Print
        </button>
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
    </div>
  );
}
