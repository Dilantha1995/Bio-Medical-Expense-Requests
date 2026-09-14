"use client";

import { emptyShippingItem, shippingItemTotal, shippingGrandTotal } from "@/lib/shippingCalc";
import { formatMVR } from "@/lib/calc";
import { CURRENCIES } from "@/lib/currencies";
import LocationPicker from "./LocationPicker";
import SelectWithAdd from "./SelectWithAdd";

export default function ShippingLineItemsTable({ items, onChange }) {
  function updateItem(index, key, value) {
    const next = items.slice();
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  }

  function addRow() {
    onChange([...items, emptyShippingItem()]);
  }

  function removeRow(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  function CurrencySelect({ value, onChange: onSel }) {
    return (
      <select value={value || "MVR"} onChange={(e) => onSel(e.target.value)} className="w-full border rounded px-2 py-2 text-sm">
        {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Date</label>
                  <input type="date" value={item.date} onChange={(e) => updateItem(i, "date", e.target.value)}
                    className="w-full border rounded px-2 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">DN Number</label>
                  <input value={item.dnNumber} onChange={(e) => updateItem(i, "dnNumber", e.target.value)}
                    className="w-full border rounded px-2 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">Description</label>
                <input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                  className="w-full border rounded px-2 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Ref No.</label>
                  <input value={item.refNo} onChange={(e) => updateItem(i, "refNo", e.target.value)}
                    className="w-full border rounded px-2 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Location</label>
                  <LocationPicker value={item.location} onChange={(v) => updateItem(i, "location", v)} placeholder="Island" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-0.5">Type of Expense</label>
                <SelectWithAdd listKey="shipping_expense_type" value={item.expenseType} onChange={(v) => updateItem(i, "expenseType", v)} placeholder="-- select --" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Amount</label>
                  <input type="number" inputMode="decimal" step="0.01" value={item.amount}
                    onChange={(e) => updateItem(i, "amount", e.target.value)}
                    className="w-full border rounded px-2 py-2 text-sm text-right" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Currency</label>
                  <CurrencySelect value={item.currency} onChange={(v) => updateItem(i, "currency", v)} />
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between px-1">
          <button type="button" onClick={addRow} className="text-sm text-brand-navy font-medium py-2">+ Add expense</button>
          <span className="text-sm font-semibold">TOTAL: {formatMVR(shippingGrandTotal(items))}</span>
        </div>
      </div>

      {/* Desktop / tablet: table */}
      <div className="hidden md:block overflow-x-auto border rounded-lg">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left border-b">Srn</th>
              <th className="p-2 text-left border-b">Date</th>
              <th className="p-2 text-left border-b">Description</th>
              <th className="p-2 text-left border-b">DN Number</th>
              <th className="p-2 text-left border-b">Ref No.</th>
              <th className="p-2 text-left border-b">Location</th>
              <th className="p-2 text-left border-b">Type of Expense</th>
              <th className="p-2 text-right border-b">Amount</th>
              <th className="p-2 text-left border-b">Currency</th>
              <th className="p-2 border-b"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-2 align-top text-gray-400">{i + 1}</td>
                <td className="p-1 align-top">
                  <input type="date" value={item.date} onChange={(e) => updateItem(i, "date", e.target.value)}
                    className="w-32 border rounded px-2 py-1" />
                </td>
                <td className="p-1 align-top">
                  <input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                    className="w-40 border rounded px-2 py-1" />
                </td>
                <td className="p-1 align-top">
                  <input value={item.dnNumber} onChange={(e) => updateItem(i, "dnNumber", e.target.value)}
                    className="w-24 border rounded px-2 py-1" />
                </td>
                <td className="p-1 align-top">
                  <input value={item.refNo} onChange={(e) => updateItem(i, "refNo", e.target.value)}
                    className="w-24 border rounded px-2 py-1" />
                </td>
                <td className="p-1 align-top">
                  <div className="w-32"><LocationPicker value={item.location} onChange={(v) => updateItem(i, "location", v)} placeholder="Island" /></div>
                </td>
                <td className="p-1 align-top">
                  <div className="w-36"><SelectWithAdd listKey="shipping_expense_type" value={item.expenseType} onChange={(v) => updateItem(i, "expenseType", v)} placeholder="-- select --" /></div>
                </td>
                <td className="p-1 align-top">
                  <input type="number" step="0.01" value={item.amount} onChange={(e) => updateItem(i, "amount", e.target.value)}
                    className="w-24 border rounded px-2 py-1 text-right" />
                </td>
                <td className="p-1 align-top">
                  <div className="w-20"><CurrencySelect value={item.currency} onChange={(v) => updateItem(i, "currency", v)} /></div>
                </td>
                <td className="p-1 align-top">
                  <button type="button" onClick={() => removeRow(i)} className="text-brand-red text-xs hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="p-2 text-right font-semibold border-t">TOTAL</td>
              <td colSpan={2} className="p-2 text-left font-semibold border-t whitespace-nowrap">{formatMVR(shippingGrandTotal(items))} (mixed-currency items summed as-is)</td>
              <td className="border-t"></td>
            </tr>
          </tfoot>
        </table>
        <div className="p-2">
          <button type="button" onClick={addRow} className="text-sm text-brand-navy hover:underline">+ Add expense</button>
        </div>
      </div>
    </div>
  );
}
