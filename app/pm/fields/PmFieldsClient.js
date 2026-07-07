"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const TYPE_LABELS = { text: "Text", number: "Number", date: "Date", select: "Dropdown list", user: "Assigned engineer" };

export default function PmFieldsClient() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [optionsText, setOptionsText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/pm/fields");
    const data = await res.json();
    setFields(data.fields || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const options = fieldType === "select" ? optionsText.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const res = await fetch("/api/pm/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, fieldType, options }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to add column."); return; }
    setLabel(""); setOptionsText(""); setFieldType("text");
    load();
  }

  async function updateOptions(field, newOptionsText) {
    const options = newOptionsText.split(",").map((s) => s.trim()).filter(Boolean);
    await fetch(`/api/pm/fields/${field.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options }),
    });
    load();
  }

  async function move(field, dir) {
    const idx = fields.findIndex((f) => f.id === field.id);
    const other = fields[idx + dir];
    if (!other) return;
    await Promise.all([
      fetch(`/api/pm/fields/${field.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: other.sort_order }) }),
      fetch(`/api/pm/fields/${other.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: field.sort_order }) }),
    ]);
    load();
  }

  async function remove(field) {
    if (!window.confirm(`Delete column "${field.label}"? Existing data in this column will no longer be shown.`)) return;
    await fetch(`/api/pm/fields/${field.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-navy">PM Schedule — Columns</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/pm" className="border rounded-md px-3 py-1.5">Back to schedule</Link>
          <Link href="/pm/rules" className="border rounded-md px-3 py-1.5">Color rules</Link>
        </div>
      </div>

      <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm grid sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Column name</label>
          <input required value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Next PM Date" className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <select value={fieldType} onChange={(e) => setFieldType(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {fieldType === "select" && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Options (comma-separated)</label>
            <input value={optionsText} onChange={(e) => setOptionsText(e.target.value)}
              placeholder="Scheduled, In Progress, Completed" className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
        )}
        {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
        <div className="sm:col-span-3">
          <button type="submit" disabled={saving} className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
            {saving ? "Adding..." : "Add Column"}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Column</th>
              <th className="p-3">Type</th>
              <th className="p-3">Options</th>
              <th className="p-3">Order</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-4 text-center text-gray-400">Loading...</td></tr>}
            {!loading && fields.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-400">No columns yet — add one above (e.g. "Next PM Date", "Status", "Assigned Engineer").</td></tr>
            )}
            {fields.map((f, i) => (
              <tr key={f.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{f.label}</td>
                <td className="p-3 text-gray-500">{TYPE_LABELS[f.field_type]}</td>
                <td className="p-3">
                  {f.field_type === "select" ? (
                    <input
                      defaultValue={(f.options || []).join(", ")}
                      onBlur={(e) => updateOptions(f, e.target.value)}
                      className="border rounded px-2 py-1 text-xs w-56"
                    />
                  ) : "-"}
                </td>
                <td className="p-3">
                  <button onClick={() => move(f, -1)} disabled={i === 0} className="text-xs border rounded px-2 mr-1 disabled:opacity-30">↑</button>
                  <button onClick={() => move(f, 1)} disabled={i === fields.length - 1} className="text-xs border rounded px-2 disabled:opacity-30">↓</button>
                </td>
                <td className="p-3">
                  <button onClick={() => remove(f)} className="text-xs text-brand-red hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
