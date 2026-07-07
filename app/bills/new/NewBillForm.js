"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LineItemsTable from "@/components/LineItemsTable";
import PreviewModal from "@/components/PreviewModal";
import SubmitActions from "@/components/SubmitActions";
import { emptyLineItem } from "@/lib/calc";

function blankState() {
  return {
    summaryDate: new Date().toISOString().slice(0, 10),
    destinationLabel: "",
    purposeOfTravel: "",
    notes: "",
    items: [emptyLineItem()],
    advanceRequestId: "",
    advanceReceived: "",
  };
}

export default function NewBillForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectId = searchParams.get("advanceRequestId") || "";

  const [form, setForm] = useState(() => ({ ...blankState(), advanceRequestId: preselectId }));
  const [myRequests, setMyRequests] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState("");
  const [nextRefNumber, setNextRefNumber] = useState("");

  function loadNextRefNumber() {
    fetch("/api/bills/next-ref-number")
      .then((r) => r.json())
      .then((d) => setNextRefNumber(d.refNumber || ""));
  }
  useEffect(() => { loadNextRefNumber(); }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    fetch("/api/requests?status=approved")
      .then((r) => r.json())
      .then((d) => {
        const list = d.requests || [];
        setMyRequests(list);
        if (preselectId) {
          const found = list.find((r) => String(r.id) === String(preselectId));
          if (found) {
            setForm((f) => ({
              ...f,
              advanceReceived: found.total_amount,
              destinationLabel: found.destination_label || "",
              purposeOfTravel: found.purpose_of_travel || "",
            }));
          }
        }
      });
  }, [preselectId]);

  function handlePickAdvance(id) {
    set("advanceRequestId", id);
    const found = myRequests.find((r) => String(r.id) === String(id));
    if (found) {
      setForm((f) => ({
        ...f,
        advanceRequestId: id,
        advanceReceived: found.total_amount,
        destinationLabel: found.destination_label || "",
        purposeOfTravel: found.purpose_of_travel || "",
      }));
    }
  }

  async function handleSubmit(mode) {
    setError("");
    setSuccessBanner("");
    setSaving(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summaryDate: form.summaryDate,
          destinationLabel: form.destinationLabel,
          purposeOfTravel: form.purposeOfTravel,
          notes: form.notes,
          lineItems: form.items,
          advanceRequestId: form.advanceRequestId || null,
          advanceReceived: form.advanceReceived,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit bill summary.");
        setSaving(false);
        return;
      }

      const refNumber = data.bill.ref_number;
      const id = data.bill.id;

      if (mode === "print") {
        window.open(`/api/bills/${id}/pdf`, "_blank");
        router.push(`/bills/${id}`);
      } else if (mode === "new") {
        setSuccessBanner(`Saved as ${refNumber}. Ready for another bill summary.`);
        setForm(blankState());
        setSaving(false);
        loadNextRefNumber();
      } else {
        router.push(`/bills/${id}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {nextRefNumber && (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2 text-sm text-blue-800">
          This will be saved as <span className="font-mono font-semibold">{nextRefNumber}</span> — not reserved until you save. Cancel or navigate away and nothing is recorded.
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" required value={form.summaryDate} onChange={(e) => set("summaryDate", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
          <input value={form.destinationLabel} onChange={(e) => set("destinationLabel", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Related Advance Request</label>
          <select value={form.advanceRequestId} onChange={(e) => handlePickAdvance(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm">
            <option value="">-- None --</option>
            {myRequests.map((r) => (
              <option key={r.id} value={r.id}>{r.ref_number} — {r.destination_label} (MVR {r.total_amount})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Advance Received (MVR)</label>
          <input type="number" step="0.01" value={form.advanceReceived} onChange={(e) => set("advanceReceived", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Travel</label>
          <input value={form.purposeOfTravel} onChange={(e) => set("purposeOfTravel", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Trip Locations &amp; Actual Expenses</h2>
        <p className="text-xs text-gray-400 mb-2">Add one row per island/leg. Attach the original bills/receipts separately per your SOP.</p>
        <LineItemsTable items={form.items} onChange={(items) => set("items", items)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <SubmitActions
        saving={saving}
        successBanner={successBanner}
        onPreview={() => setShowPreview(true)}
        onSubmit={handleSubmit}
      />

      {showPreview && (
        <PreviewModal
          title="Bill Summary — Preview"
          meta={[
            ["Date", form.summaryDate],
            ["Destination", form.destinationLabel],
            ["Purpose of Travel", form.purposeOfTravel],
            ["Advance Received", form.advanceReceived ? `MVR ${form.advanceReceived}` : "-"],
            ["Notes", form.notes],
          ]}
          items={form.items}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
