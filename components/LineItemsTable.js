"use client";

import { emptyLineItem, lineItemTotal, grandTotal, formatMVR } from "@/lib/calc";
import LocationPicker from "./LocationPicker";

const NUMERIC_COLS = [
  { key: "days", label: "No of days" },
  { key: "food", label: "Food" },
  { key: "accommodation", label: "Accommodation" },
  { key: "airfare", label: "Air fare" },
  { key: "taxiFerry", label: "Taxi & Ferry" },
  { key: "seaTransport", label: "Sea Transport" },
  { key: "landTransport", label: "Land Transport" },
  { key: "others", label: "Others" },
];

export default function LineItemsTable({ items, onChange }) {
  function updateItem(index, key, value) {
    const next = items.slice();
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  }

  function addRow() {
    onChange([...items, emptyLineItem()]);
  }

  function removeRow(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div>
      {/* Mobile: stacked cards, one per leg */}
      <div className="md:hidden space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">Leg {i + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => removeRow(i)} className="text-brand-red text-xs py-1 px-2">
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">From island</label>
                <LocationPicker value={item.fromLocation} onChange={(v) => updateItem(i, "fromLocation", v)} placeholder="From" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">From date</label>
                <input type="date" className="w-full border rounded px-2 py-2 text-sm" value={item.fromDate}
                  onChange={(e) => updateItem(i, "fromDate", e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">To island</label>
                <LocationPicker value={item.toLocation} onChange={(v) => updateItem(i, "toLocation", v)} placeholder="To" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">To date</label>
                <input type="date" className="w-full border rounded px-2 py-2 text-sm" value={item.toDate}
                  onChange={(e) => updateItem(i, "toDate", e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">Mode</label>
                <select className="w-full border rounded px-2 py-2 text-sm" value={item.mode}
                  onChange={(e) => updateItem(i, "mode", e.target.value)}>
                  <option value="">-</option>
                  <option value="SEA">SEA</option>
                  <option value="AIR">AIR</option>
                  <option value="LAND">LAND</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">No of days</label>
                <input type="number" inputMode="decimal" className="w-full border rounded px-2 py-2 text-sm" value={item.days}
                  onChange={(e) => updateItem(i, "days", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t pt-2">
              {NUMERIC_COLS.filter((c) => c.key !== "days").map((c) => (
                <div key={c.key}>
                  <label className="block text-[11px] text-gray-500 mb-0.5">{c.label}</label>
                  <input type="number" inputMode="decimal" step="0.01" className="w-full border rounded px-2 py-2 text-sm text-right"
                    value={item[c.key]}
                    onChange={(e) => updateItem(i, c.key, e.target.value)} />
                </div>
              ))}
            </div>

            <div className="text-right mt-2 pt-2 border-t text-sm font-semibold text-brand-navy">
              Leg total: {formatMVR(lineItemTotal(item))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between px-1">
          <button type="button" onClick={addRow} className="text-sm text-brand-navy font-medium py-2">
            + Add another location/leg
          </button>
          <span className="text-sm font-semibold">TOTAL: {formatMVR(grandTotal(items))}</span>
        </div>
      </div>

      {/* Desktop / tablet: full table */}
      <div className="hidden md:block overflow-x-auto border rounded-lg">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left border-b">#</th>
              <th className="p-2 text-left border-b">From (island / date)</th>
              <th className="p-2 text-left border-b">To (island / date)</th>
              <th className="p-2 text-left border-b">Mode</th>
              {NUMERIC_COLS.map((c) => (
                <th key={c.key} className="p-2 text-right border-b whitespace-nowrap">{c.label}</th>
              ))}
              <th className="p-2 text-right border-b">Total</th>
              <th className="p-2 border-b"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-2 align-top text-gray-400">{i + 1}</td>
                <td className="p-1 align-top">
                  <div className="mb-1">
                    <LocationPicker value={item.fromLocation} onChange={(v) => updateItem(i, "fromLocation", v)} placeholder="From island" />
                  </div>
                  <input type="date" className="w-full border rounded px-1 py-1" value={item.fromDate}
                    onChange={(e) => updateItem(i, "fromDate", e.target.value)} />
                </td>
                <td className="p-1 align-top">
                  <div className="mb-1">
                    <LocationPicker value={item.toLocation} onChange={(v) => updateItem(i, "toLocation", v)} placeholder="To island" />
                  </div>
                  <input type="date" className="w-full border rounded px-1 py-1" value={item.toDate}
                    onChange={(e) => updateItem(i, "toDate", e.target.value)} />
                </td>
                <td className="p-1 align-top">
                  <select className="w-20 border rounded px-1 py-1" value={item.mode}
                    onChange={(e) => updateItem(i, "mode", e.target.value)}>
                    <option value="">-</option>
                    <option value="SEA">SEA</option>
                    <option value="AIR">AIR</option>
                    <option value="LAND">LAND</option>
                  </select>
                </td>
                {NUMERIC_COLS.map((c) => (
                  <td key={c.key} className="p-1 align-top">
                    <input type="number" step="0.01" className="w-20 border rounded px-1 py-1 text-right"
                      value={item[c.key]}
                      onChange={(e) => updateItem(i, c.key, e.target.value)} />
                  </td>
                ))}
                <td className="p-2 align-top text-right font-medium whitespace-nowrap">
                  {formatMVR(lineItemTotal(item))}
                </td>
                <td className="p-1 align-top">
                  <button type="button" onClick={() => removeRow(i)} className="text-brand-red text-xs hover:underline">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4 + NUMERIC_COLS.length} className="p-2 text-right font-semibold border-t">TOTAL</td>
              <td className="p-2 text-right font-semibold border-t whitespace-nowrap">{formatMVR(grandTotal(items))}</td>
              <td className="border-t"></td>
            </tr>
          </tfoot>
        </table>
        <div className="p-2">
          <button type="button" onClick={addRow} className="text-sm text-brand-navy hover:underline">
            + Add another location/leg
          </button>
        </div>
      </div>
    </div>
  );
}
