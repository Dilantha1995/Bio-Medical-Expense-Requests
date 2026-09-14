"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ShippingLineItemsTable from "@/components/ShippingLineItemsTable";
import SubmitActions from "@/components/SubmitActions";
import CompanySelector from "@/components/CompanySelector";
import { emptyShippingItem, shippingGrandTotal, shippingItemTotal } from "@/lib/shippingCalc";
import { formatMVR } from "@/lib/calc";

function blankState() {
  return {
    requestDate: new Date().toISOString().slice(0, 10),
    notes: "",
    items: [emptyShippingItem()],
    company: "PSMS",
  };
}

export default function NewShippingForm() {
  const router = useRouter();
  const [form, setForm] = useState(blankState());
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState("");
  const [nextRefNumber, setNextRefNumber] = useState("");

  function loadNextRefNumber(company) {
    fetch(`/api/shipping/next-ref-number?company=${company || form.company}`)
      .then((r) => r.json())
      .then((d) => setNextRefNumber(d.refNumber || ""));
  }
  useEffect(() => { loadNextRefNumber(form.company); }, [form.company]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(mode) {
    setError("");
    setSuccessBanner("");
    setSaving(true);
    try {
      const res = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestDate: form.requestDate,
          notes: form.notes,
          lineItems: form.items,
          company: form.company,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit shipping expense request.");
        setSaving(false);
        return;
      }

      const refNumber = data.shipping.ref_number;
      const id = data.shipping.id;

      if (mode === "print") {
        window.open(`/api/shipping/${id}/pdf`, "_blank");
        router.push(`/shipping/${id}`);
      } else if (mode === "new") {
        setSuccessBanner(`Saved as ${refNumber}. Ready for another shipping expense request.`);
        setForm(blankState());
        setSaving(false);
        loadNextRefNumber("PSMS");
      } else {
        router.push(`/shipping/${id}`);
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
          <input type="date" required value={form.requestDate} onChange={(e) => set("requestDate", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-3">
          <CompanySelector value={form.company} onChange={(v) => set("company", v)} />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Shipping Expenses</h2>
        <p className="text-xs text-gray-400 mb-2">One row per expense item (boat charge, taxi, delivery, crane, food, etc.).</p>
        <ShippingLineItemsTable items={form.items} onChange={(items) => set("items", items)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <SubmitActions
        saving={saving}
        successBanner={successBanner}
        onPreview={() => setShowPreview(true)}
        onSubmit={handleSubmit}
      />

      {showPreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-brand-navy">Shipping Expense Request — Preview</h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600 text-xl px-2 -mr-2">✕</button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Preview only — the reference number is assigned when you submit.</p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm mb-4">
              <p><span className="font-medium">Date:</span> {form.requestDate}</p>
              <p><span className="font-medium">Company:</span> {form.company}</p>
              <p className="sm:col-span-2"><span className="font-medium">Notes:</span> {form.notes || "-"}</p>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Srn</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-left">DN No.</th>
                    <th className="p-2 text-left">Ref No.</th>
                    <th className="p-2 text-left">Location</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-left">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((it, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2">{it.date}</td>
                      <td className="p-2">{it.description}</td>
                      <td className="p-2">{it.dnNumber}</td>
                      <td className="p-2">{it.refNo}</td>
                      <td className="p-2">{it.location}</td>
                      <td className="p-2">{it.expenseType}</td>
                      <td className="p-2 text-right">{formatMVR(shippingItemTotal(it))}</td>
                      <td className="p-2">{it.currency}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td colSpan={7} className="p-2 text-right">TOTAL</td>
                    <td colSpan={2} className="p-2 text-left">{formatMVR(shippingGrandTotal(form.items))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setShowPreview(false)} className="border px-4 py-2 rounded-md text-sm">Close Preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
