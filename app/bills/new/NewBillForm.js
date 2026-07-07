"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LineItemsTable from "@/components/LineItemsTable";
import { emptyLineItem } from "@/lib/calc";

export default function NewBillForm() {
  const router = useRouter();
  const [summaryDate, setSummaryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [destinationLabel, setDestinationLabel] = useState("");
  const [purposeOfTravel, setPurposeOfTravel] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([emptyLineItem()]);
  const [advanceRequestId, setAdvanceRequestId] = useState("");
  const [advanceReceived, setAdvanceReceived] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/requests?status=approved")
      .then((r) => r.json())
      .then((d) => setMyRequests(d.requests || []));
  }, []);

  function handlePickAdvance(id) {
    setAdvanceRequestId(id);
    const found = myRequests.find((r) => String(r.id) === String(id));
    if (found) {
      setAdvanceReceived(found.total_amount);
      setDestinationLabel(found.destination_label || "");
      setPurposeOfTravel(found.purpose_of_travel || "");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summaryDate, destinationLabel, purposeOfTravel, notes, lineItems: items,
          advanceRequestId: advanceRequestId || null, advanceReceived,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit bill summary.");
        setSaving(false);
        return;
      }
      router.push(`/bills/${data.bill.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" required value={summaryDate} onChange={(e) => setSummaryDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
          <input value={destinationLabel} onChange={(e) => setDestinationLabel(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Related Advance Request (optional)</label>
          <select value={advanceRequestId} onChange={(e) => handlePickAdvance(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm">
            <option value="">-- None --</option>
            {myRequests.map((r) => (
              <option key={r.id} value={r.id}>{r.ref_number} — {r.destination_label} (MVR {r.total_amount})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Advance Received (MVR)</label>
          <input type="number" step="0.01" value={advanceReceived} onChange={(e) => setAdvanceReceived(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Travel</label>
          <input value={purposeOfTravel} onChange={(e) => setPurposeOfTravel(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Trip Locations &amp; Actual Expenses</h2>
        <p className="text-xs text-gray-400 mb-2">Add one row per island/leg. Attach the original bills/receipts separately per your SOP.</p>
        <LineItemsTable items={items} onChange={setItems} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={saving}
        className="bg-brand-teal text-white px-5 py-2 rounded-md text-sm font-medium disabled:opacity-50">
        {saving ? "Submitting..." : "Submit Bill Summary"}
      </button>
    </form>
  );
}
