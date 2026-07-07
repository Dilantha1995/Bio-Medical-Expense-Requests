"use client";

import { lineItemTotal, grandTotal, formatMVR } from "@/lib/calc";

export default function PreviewModal({ title, meta, items, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Preview only — the reference number is assigned when you submit.</p>

        <div className="grid sm:grid-cols-2 gap-2 text-sm mb-4">
          {meta.map(([label, value]) => (
            <p key={label}><span className="font-medium">{label}:</span> {value || "-"}</p>
          ))}
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">From</th>
                <th className="p-2 text-left">To</th>
                <th className="p-2 text-left">Mode</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">{it.fromLocation} ({it.fromDate})</td>
                  <td className="p-2">{it.toLocation} ({it.toDate})</td>
                  <td className="p-2">{it.mode}</td>
                  <td className="p-2 text-right">{formatMVR(lineItemTotal(it))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td colSpan={4} className="p-2 text-right">TOTAL</td>
                <td className="p-2 text-right">{formatMVR(grandTotal(items))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="border px-4 py-2 rounded-md text-sm">Close Preview</button>
        </div>
      </div>
    </div>
  );
}
