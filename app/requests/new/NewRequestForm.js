"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LineItemsTable from "@/components/LineItemsTable";
import PreviewModal from "@/components/PreviewModal";
import SubmitActions from "@/components/SubmitActions";
import { emptyLineItem } from "@/lib/calc";

function blankState() {
  return {
    requestDate: new Date().toISOString().slice(0, 10),
    destinationLabel: "",
    purposeOfTravel: "",
    notes: "",
    items: [emptyLineItem()],
  };
}

export default function NewRequestForm() {
  const router = useRouter();
  const [form, setForm] = useState(blankState());
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(mode) {
    setError("");
    setSuccessBanner("");
    setSaving(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestDate: form.requestDate,
          destinationLabel: form.destinationLabel,
          purposeOfTravel: form.purposeOfTravel,
          notes: form.notes,
          lineItems: form.items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit request.");
        setSaving(false);
        return;
      }

      const refNumber = data.request.ref_number;
      const id = data.request.id;

      if (mode === "print") {
        window.open(`/api/requests/${id}/pdf`, "_blank");
        router.push(`/requests/${id}`);
      } else if (mode === "new") {
        setSuccessBanner(`Saved as ${refNumber}. Ready for another advance request.`);
        setForm(blankState());
        setSaving(false);
      } else {
        router.push(`/requests/${id}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" required value={form.requestDate} onChange={(e) => set("requestDate", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Trip summary (e.g. "Lh Naifaru + Hinnavaru")</label>
          <input value={form.destinationLabel} onChange={(e) => set("destinationLabel", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Travel</label>
          <input value={form.purposeOfTravel} onChange={(e) => set("purposeOfTravel", e.target.value)}
            placeholder='e.g. "Vitros 350 Service Call"'
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Trip Locations &amp; Expenses</h2>
        <p className="text-xs text-gray-400 mb-2">Add one row per island/leg if you're visiting multiple locations on this trip.</p>
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
          title="Travel Advance Request — Preview"
          meta={[
            ["Date", form.requestDate],
            ["Trip summary", form.destinationLabel],
            ["Purpose of Travel", form.purposeOfTravel],
            ["Notes", form.notes],
          ]}
          items={form.items}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
