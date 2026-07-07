"use client";

import { emptyLineItem, lineItemTotal, grandTotal, formatMVR } from "@/lib/calc";

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
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left border-b">#</th>
            <th className="p-2 text-left border-b">Name</th>
            <th className="p-2 text-left border-b">Designation</th>
            <th className="p-2 text-left border-b">From (loc / date)</th>
            <th className="p-2 text-left border-b">To (loc / date)</th>
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
                <input className="w-28 border rounded px-1 py-1" value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)} />
              </td>
              <td className="p-1 align-top">
                <input className="w-28 border rounded px-1 py-1" value={item.designation}
                  onChange={(e) => updateItem(i, "designation", e.target.value)} />
              </td>
              <td className="p-1 align-top">
                <input className="w-24 border rounded px-1 py-1 mb-1" placeholder="Location" value={item.fromLocation}
                  onChange={(e) => updateItem(i, "fromLocation", e.target.value)} />
                <input type="date" className="w-24 border rounded px-1 py-1" value={item.fromDate}
                  onChange={(e) => updateItem(i, "fromDate", e.target.value)} />
              </td>
              <td className="p-1 align-top">
                <input className="w-24 border rounded px-1 py-1 mb-1" placeholder="Location" value={item.toLocation}
                  onChange={(e) => updateItem(i, "toLocation", e.target.value)} />
                <input type="date" className="w-24 border rounded px-1 py-1" value={item.toDate}
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
            <td colSpan={6 + NUMERIC_COLS.length} className="p-2 text-right font-semibold border-t">TOTAL</td>
            <td className="p-2 text-right font-semibold border-t whitespace-nowrap">{formatMVR(grandTotal(items))}</td>
            <td className="border-t"></td>
          </tr>
        </tfoot>
      </table>
      <div className="p-2">
        <button type="button" onClick={addRow} className="text-sm text-brand-navy hover:underline">
          + Add team member row
        </button>
      </div>
    </div>
  );
}
