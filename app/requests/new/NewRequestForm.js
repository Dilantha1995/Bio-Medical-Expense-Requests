"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LineItemsTable from "@/components/LineItemsTable";
import { emptyLineItem } from "@/lib/calc";

export default function NewRequestForm() {
  const router = useRouter();
  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [destinationLabel, setDestinationLabel] = useState("");
  const [purposeOfTravel, setPurposeOfTravel] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([emptyLineItem()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestDate, destinationLabel, purposeOfTravel, notes, lineItems: items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit request.");
        setSaving(false);
        return;
      }
      router.push(`/requests/${data.request.id}`);
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
          <input type="date" required value={requestDate} onChange={(e) => setRequestDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Destination (e.g. "LH, Naifaru Island")</label>
          <input value={destinationLabel} onChange={(e) => setDestinationLabel(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Travel</label>
          <input value={purposeOfTravel} onChange={(e) => setPurposeOfTravel(e.target.value)}
            placeholder='e.g. "Vitros 350 Service Call"'
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Service Team Members &amp; Expenses</h2>
        <LineItemsTable items={items} onChange={setItems} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={saving}
        className="bg-brand-navy text-white px-5 py-2 rounded-md text-sm font-medium disabled:opacity-50">
        {saving ? "Submitting..." : "Submit Advance Request"}
      </button>
    </form>
  );
}
