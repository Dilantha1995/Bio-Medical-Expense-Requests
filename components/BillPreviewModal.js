"use client";

import { billItemTotal, billGrandTotal, categoryVariance, CATEGORY_LABELS } from "@/lib/billCalc";
import { EXPENSE_FIELDS, formatMVR } from "@/lib/calc";

const CATEGORY_COLS = EXPENSE_FIELDS.map((key) => ({ key, label: CATEGORY_LABELS[key] }));

export default function BillPreviewModal({ title, meta, items, advanceLineItems, onClose }) {
  const grandTotal = billGrandTotal(items);
  const variance = advanceLineItems && advanceLineItems.length > 0 ? categoryVariance(items, advanceLineItems) : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-brand-navy">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-2 -mr-2">✕</button>
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
                <th className="p-2 text-left">Srn</th>
                <th className="p-2 text-left">Bill Date</th>
                <th className="p-2 text-left">Bill No.</th>
                <th className="p-2 text-left">Supplier Name</th>
                <th className="p-2 text-left">Description</th>
                {CATEGORY_COLS.map((c) => (
                  <th key={c.key} className="p-2 text-right whitespace-nowrap">{c.label}</th>
                ))}
                <th className="p-2 text-left">Supporting Docs</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">{it.billDate}</td>
                  <td className="p-2">{it.billNo}</td>
                  <td className="p-2">{it.supplierName}</td>
                  <td className="p-2">{it.description}</td>
                  {CATEGORY_COLS.map((c) => (
                    <td key={c.key} className="p-2 text-right">{formatMVR(it[c.key])}</td>
                  ))}
                  <td className="p-2">{it.supportingDocs}</td>
                  <td className="p-2 text-right">{formatMVR(billItemTotal(it))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td colSpan={5 + CATEGORY_COLS.length} className="p-2 text-right">TOTAL</td>
                <td className="p-2"></td>
                <td className="p-2 text-right">{formatMVR(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {variance && (
          <div className="border rounded-lg mt-4 overflow-x-auto">
            <p className="font-medium text-sm p-2 border-b bg-gray-50">Advance vs Actual by Category</p>
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="p-2">Category</th>
                  <th className="p-2 text-right">Advance Taken</th>
                  <th className="p-2 text-right">Actual Spent</th>
                  <th className="p-2 text-right">Variance</th>
                </tr>
              </thead>
              <tbody>
                {variance.map((r) => (
                  <tr key={r.key} className={`border-b last:border-0 ${r.isTotal ? "font-semibold bg-gray-50" : ""}`}>
                    <td className="p-2">{r.label}</td>
                    <td className="p-2 text-right">{formatMVR(r.advance)}</td>
                    <td className="p-2 text-right">{formatMVR(r.actual)}</td>
                    <td className={`p-2 text-right ${r.variance > 0 ? "text-red-600" : r.variance < 0 ? "text-green-700" : ""}`}>
                      {r.variance > 0 ? "+" : ""}{formatMVR(r.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-gray-400 p-2">Positive variance = spent more than advance; negative = under advance.</p>
          </div>
        )}

        <div className="mt-4 text-right">
          <button onClick={onClose} className="border px-4 py-2 rounded-md text-sm">Close Preview</button>
        </div>
      </div>
    </div>
  );
}
