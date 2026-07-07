"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActionsBar({ id, kind, status, session, returnedAt }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    router.refresh();
  }

  function handleMarkReturned() {
    const input = window.prompt("Date the engineer returned to the office (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    if (!input) return;
    doAction("mark_returned", { returnedAt: input });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {canCheck && (
        <button onClick={() => doAction("check")} disabled={busy}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md disabled:opacity-50">
          Mark Checked
        </button>
      )}
      {canApprove && (
        <button onClick={() => doAction("approve")} disabled={busy}
          className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-md disabled:opacity-50">
          Approve
        </button>
      )}
      {canReject && (
        <button onClick={() => doAction("reject")} disabled={busy}
          className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-md disabled:opacity-50">
          Reject
        </button>
      )}
      {canMarkReturned && (
        <button onClick={handleMarkReturned} disabled={busy}
          className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded-md disabled:opacity-50">
          {returnedAt ? "Update Return Date" : "Mark Returned"}
        </button>
      )}
      <a href={`/api/${kind}/${id}/pdf`} target="_blank" rel="noreferrer"
        className="text-sm border border-brand-navy text-brand-navy px-3 py-1.5 rounded-md">
        Download PDF
      </a>
      <button onClick={() => window.print()} className="text-sm border px-3 py-1.5 rounded-md">
        Print
      </button>
    </div>
  );
}
