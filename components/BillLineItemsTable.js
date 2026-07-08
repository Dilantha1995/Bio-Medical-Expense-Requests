"use client";

import { useEffect, useState } from "react";
import { emptyBillItem, billItemTotal, billGrandTotal, SUPPORTING_DOC_OPTIONS } from "@/lib/billCalc";
import { formatMVR } from "@/lib/calc";

export default function BillLineItemsTable({ items, onChange }) {
  const [natureOptions, setNatureOptions] = useState([]);

  useEffect(() => {
    fetch("/api/config/nature-of-payment")
      .then((r) => r.json())
      .then((d) => setNatureOptions(d.options || []));
  }, []);

  function updateItem(index, key, value) {
    const next = items.slice();
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  }

  function addRow() {
    onChange([...items, emptyBillItem()]);
  }

  function removeRow(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  function NatureSelect({ value, onChange: onSel }) {
    return (
      <select value={value} onChange={(e) => onSel(e.target.value)} className="w-full border rounded px-2 py-2 text-sm">
        <option value="">-- select --</option>
        {natureOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
      </select>
    );
  }

  function SupportingSelect({ value, onChange: onSel }) {
    return (
      <select value={value} onChange={(e) => onSel(e.target.value)} className="w-full border rounded px-2 py-2 text-sm">
        <option value="">-- select --</option>
        {SUPPORTING_DOC_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  return (
    <div>
      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">Srn {i + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => removeRow(i)} className="text-brand-red text-xs py-1 px-2">Remove</button>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">Description</label>
                <input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                  className="w-full border rounded px-2 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Bill No.</label>
                  <input value={item.billNo} onChange={(e) => updateItem(i, "billNo", e.target.value)}
                    className="w-full border rounded px-2 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Amount (MVR)</label>
                  <input type="number" inputMode="decimal" step="0.01" value={item.amount}
                    onChange={(e) => updateItem(i, "amount", e.target.value)}
                    className="w-full border rounded px-2 py-2 text-sm text-right" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">Nature of Payment</label>
                <NatureSelect value={item.natureOfPayment} onChange={(v) => updateItem(i, "natureOfPayment", v)} />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">Supporting Documents</label>
                <SupportingSelect value={item.supportingDocs} onChange={(v) => updateItem(i, "supportingDocs", v)} />
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between px-1">
          <button type="button" onClick={addRow} className="text-sm text-brand-navy font-medium py-2">+ Add bill</button>
          <span className="text-sm font-semibold">TOTAL: {formatMVR(billGrandTotal(items))}</span>
        </div>
      </div>

      {/* Desktop / tablet: table */}
      <div className="hidden md:block overflow-x-auto border rounded-lg">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left border-b">Srn</th>
              <th className="p-2 text-left border-b">Description</th>
              <th className="p-2 text-left border-b">Bill No.</th>
              <th className="p-2 text-left border-b">Nature of Payment</th>
              <th className="p-2 text-left border-b">Supporting Documents</th>
              <th className="p-2 text-right border-b">Total Amount</th>
              <th className="p-2 border-b"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-2 align-top text-gray-400">{i + 1}</td>
                <td className="p-1 align-top">
                  <input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                    className="w-40 border rounded px-2 py-1" />
                </td>
                <td className="p-1 align-top">
                  <input value={item.billNo} onChange={(e) => updateItem(i, "billNo", e.target.value)}
                    className="w-24 border rounded px-2 py-1" />
                </td>
                <td className="p-1 align-top">
                  <div className="w-40"><NatureSelect value={item.natureOfPayment} onChange={(v) => updateItem(i, "natureOfPayment", v)} /></div>
                </td>
                <td className="p-1 align-top">
                  <div className="w-40"><SupportingSelect value={item.supportingDocs} onChange={(v) => updateItem(i, "supportingDocs", v)} /></div>
                </td>
                <td className="p-1 align-top">
                  <input type="number" step="0.01" value={item.amount} onChange={(e) => updateItem(i, "amount", e.target.value)}
                    className="w-24 border rounded px-2 py-1 text-right" />
                </td>
                <td className="p-1 align-top">
                  <button type="button" onClick={() => removeRow(i)} className="text-brand-red text-xs hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="p-2 text-right font-semibold border-t">TOTAL</td>
              <td className="p-2 text-right font-semibold border-t whitespace-nowrap">{formatMVR(billGrandTotal(items))}</td>
              <td className="border-t"></td>
            </tr>
          </tfoot>
        </table>
        <div className="p-2">
          <button type="button" onClick={addRow} className="text-sm text-brand-navy hover:underline">+ Add bill</button>
        </div>
      </div>
    </div>
  );
}
