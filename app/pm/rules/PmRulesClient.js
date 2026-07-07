"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OPERATORS_BY_TYPE } from "@/lib/pmRules";

const PRESET_COLORS = [
  { color: "#fecaca", label: "Red" },
  { color: "#fed7aa", label: "Orange" },
  { color: "#fef08a", label: "Yellow" },
  { color: "#bbf7d0", label: "Green" },
  { color: "#bfdbfe", label: "Blue" },
  { color: "#e9d5ff", label: "Purple" },
  { color: "#e5e7eb", label: "Grey" },
];

function emptyForm(fields) {
  return {
    fieldKey: fields[0]?.key || "",
    operator: "",
    compareValue: "",
    color: PRESET_COLORS[0].color,
    label: "",
    applyTo: "cell",
    priority: 0,
  };
}

export default function PmRulesClient() {
  const [fields, setFields] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fieldKey: "", operator: "", compareValue: "", color: PRESET_COLORS[0].color, label: "", applyTo: "cell", priority: 0 });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [fRes, rRes] = await Promise.all([fetch("/api/pm/fields"), fetch("/api/pm/rules")]);
    const fData = await fRes.json();
    const rData = await rRes.json();
    setFields(fData.fields || []);
    setRules(rData.rules || []);
    setForm((f) => ({ ...f, fieldKey: f.fieldKey || fData.fields?.[0]?.key || "" }));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const selectedField = fields.find((f) => f.key === form.fieldKey);
  const operators = selectedField ? (OPERATORS_BY_TYPE[selectedField.field_type] || []) : [];

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!form.operator) { setError("Choose a condition."); return; }
    setSaving(true);
    const res = await fetch("/api/pm/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to add rule."); return; }
    setForm((f) => ({ ...emptyForm(fields), fieldKey: f.fieldKey }));
    load();
  }

  async function toggleActive(rule) {
    await fetch(`/api/pm/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rule.active }),
    });
    load();
  }

  async function remove(rule) {
    if (!window.confirm("Delete this rule?")) return;
    await fetch(`/api/pm/rules/${rule.id}`, { method: "DELETE" });
    load();
  }

  function fieldLabel(key) {
    return fields.find((f) => f.key === key)?.label || key;
  }
  function operatorLabel(fieldKey, op) {
    const field = fields.find((f) => f.key === fieldKey);
    const ops = field ? OPERATORS_BY_TYPE[field.field_type] || [] : [];
    return ops.find((o) => o.value === op)?.label || op;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-navy">PM Schedule — Color Rules</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/pm" className="border rounded-md px-3 py-1.5">Back to schedule</Link>
          <Link href="/pm/fields" className="border rounded-md px-3 py-1.5">Columns</Link>
        </div>
      </div>

      {fields.length === 0 && !loading ? (
        <p className="text-sm text-gray-500">Add at least one column first (Columns page) before creating color rules.</p>
      ) : (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm grid sm:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Column</label>
            <select value={form.fieldKey} onChange={(e) => setForm({ ...form, fieldKey: e.target.value, operator: "" })}
              className="w-full border rounded-md px-2 py-2 text-sm">
              {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
            <select value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })}
              className="w-full border rounded-md px-2 py-2 text-sm">
              <option value="">-- choose --</option>
              {operators.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {!["is_empty", "is_not_empty", "before_today", "after_today"].includes(form.operator) && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {form.operator === "within_days" ? "Days" : "Value"}
              </label>
              <input value={form.compareValue} onChange={(e) => setForm({ ...form, compareValue: e.target.value })}
                className="w-full border rounded-md px-2 py-2 text-sm" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
            <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full border rounded-md px-2 py-2 text-sm">
              {PRESET_COLORS.map((c) => <option key={c.color} value={c.color}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Apply to</label>
            <select value={form.applyTo} onChange={(e) => setForm({ ...form, applyTo: e.target.value })}
              className="w-full border rounded-md px-2 py-2 text-sm">
              <option value="cell">Just this cell</option>
              <option value="row">Whole row</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Label (optional)</label>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Overdue" className="w-full border rounded-md px-2 py-2 text-sm" />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-6">{error}</p>}
          <div className="sm:col-span-6">
            <button type="submit" disabled={saving} className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
              {saving ? "Adding..." : "Add Rule"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Column</th>
              <th className="p-3">Condition</th>
              <th className="p-3">Value</th>
              <th className="p-3">Color</th>
              <th className="p-3">Applies to</th>
              <th className="p-3">Label</th>
              <th className="p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="p-4 text-center text-gray-400">Loading...</td></tr>}
            {!loading && rules.length === 0 && (
              <tr><td colSpan={8} className="p-4 text-center text-gray-400">No color rules yet.</td></tr>
            )}
            {rules.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-3">{fieldLabel(r.field_key)}</td>
                <td className="p-3">{operatorLabel(r.field_key, r.operator)}</td>
                <td className="p-3">{r.compare_value || "-"}</td>
                <td className="p-3"><span className="inline-block w-6 h-6 rounded border" style={{ backgroundColor: r.color }} /></td>
                <td className="p-3">{r.apply_to === "row" ? "Whole row" : "Cell"}</td>
                <td className="p-3">{r.label || "-"}</td>
                <td className="p-3">
                  <input type="checkbox" checked={r.active} onChange={() => toggleActive(r)} />
                </td>
                <td className="p-3">
                  <button onClick={() => remove(r)} className="text-xs text-brand-red hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
