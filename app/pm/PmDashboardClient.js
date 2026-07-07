"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { firstMatchingRule } from "@/lib/pmRules";

function emptyValues(fields) {
  const v = {};
  fields.forEach((f) => { v[f.key] = ""; });
  return v;
}

export default function PmDashboardClient({ session }) {
  const [fields, setFields] = useState([]);
  const [rules, setRules] = useState([]);
  const [entries, setEntries] = useState([]);
  const [machines, setMachines] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [machineId, setMachineId] = useState("");
  const [values, setValues] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [fRes, rRes, eRes, mRes, uRes] = await Promise.all([
      fetch("/api/pm/fields"), fetch("/api/pm/rules"), fetch("/api/pm/entries"),
      fetch("/api/machines"), fetch("/api/pm/users"),
    ]);
    const [fData, rData, eData, mData, uData] = await Promise.all([fRes.json(), rRes.json(), eRes.json(), mRes.json(), uRes.json()]);
    setFields(fData.fields || []);
    setRules(rData.rules || []);
    setEntries(eData.entries || []);
    setMachines(mData.machines || []);
    setUsers(uData.users || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditingId(null);
    setMachineId("");
    setValues(emptyValues(fields));
    setShowForm(true);
    setError("");
  }

  function openEdit(entry) {
    setEditingId(entry.id);
    setMachineId(String(entry.machine_id));
    setValues({ ...emptyValues(fields), ...entry.field_values });
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!machineId) { setError("Choose a machine."); return; }
    setSaving(true);
    const url = editingId ? `/api/pm/entries/${editingId}` : "/api/pm/entries";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machineId: parseInt(machineId, 10), values }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to save."); return; }
    setShowForm(false);
    load();
  }

  async function handleDelete(entry) {
    if (!window.confirm("Delete this schedule entry?")) return;
    await fetch(`/api/pm/entries/${entry.id}`, { method: "DELETE" });
    load();
  }

  // Pre-compute row-level rule per entry, and cell-level rule per (entry, field).
  const rowStyles = useMemo(() => {
    const map = {};
    entries.forEach((entry) => {
      for (const f of fields) {
        const rule = firstMatchingRule(rules, f.key, "row", entry.field_values?.[f.key]);
        if (rule) { map[entry.id] = rule; break; }
      }
    });
    return map;
  }, [entries, fields, rules]);

  function renderCellValue(field, value) {
    if (!value) return "-";
    if (field.field_type === "date") return new Date(value).toLocaleDateString();
    if (field.field_type === "user") {
      const u = users.find((u) => String(u.id) === String(value));
      return u ? u.full_name : value;
    }
    return value;
  }

  function renderFieldInput(field) {
    const val = values[field.key] ?? "";
    const onChange = (v) => setValues((prev) => ({ ...prev, [field.key]: v }));
    if (field.field_type === "date") {
      return <input type="date" value={val} onChange={(e) => onChange(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm" />;
    }
    if (field.field_type === "number") {
      return <input type="number" value={val} onChange={(e) => onChange(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm" />;
    }
    if (field.field_type === "select") {
      return (
        <select value={val} onChange={(e) => onChange(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm">
          <option value="">-</option>
          {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (field.field_type === "user") {
      return (
        <select value={val} onChange={(e) => onChange(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm">
          <option value="">Unassigned</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
      );
    }
    return <input value={val} onChange={(e) => onChange(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-brand-navy">PM &amp; Installation Schedule</h1>
        <div className="flex gap-2">
          {session.role === "admin" && (
            <>
              <Link href="/pm/fields" className="text-sm border rounded-md px-3 py-1.5">Columns</Link>
              <Link href="/pm/rules" className="text-sm border rounded-md px-3 py-1.5">Color rules</Link>
            </>
          )}
          <button onClick={openNew} className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded-md">+ Add Entry</button>
        </div>
      </div>

      {fields.length === 0 && !loading && (
        <p className="text-sm text-gray-500">
          No columns configured yet.{session.role === "admin" ? (
            <> Go to <Link href="/pm/fields" className="text-brand-navy hover:underline">Columns</Link> to set up fields like Status, Next PM Date, and Assigned Engineer.</>
          ) : " Ask an admin to set up the schedule columns."}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-600">{editingId ? "Edit Entry" : "New Schedule Entry"}</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Machine</label>
            <select required value={machineId} onChange={(e) => setMachineId(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm">
              <option value="">-- select machine --</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.name} — {m.serial_number} ({m.facility_name || "no facility set"})</option>
              ))}
            </select>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                {renderFieldInput(f)}
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Entry"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 rounded-md text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Machine</th>
              <th className="p-3">Serial</th>
              <th className="p-3">Facility</th>
              <th className="p-3">Location</th>
              {fields.map((f) => <th key={f.key} className="p-3 whitespace-nowrap">{f.label}</th>)}
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5 + fields.length} className="p-4 text-center text-gray-400">Loading...</td></tr>}
            {!loading && entries.length === 0 && (
              <tr><td colSpan={5 + fields.length} className="p-4 text-center text-gray-400">No schedule entries yet.</td></tr>
            )}
            {entries.map((entry) => {
              const rowRule = rowStyles[entry.id];
              return (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50"
                  style={rowRule ? { backgroundColor: rowRule.color, color: rowRule.text_color || undefined } : undefined}>
                  <td className="p-3 font-medium cursor-pointer" onClick={() => openEdit(entry)}>{entry.machine_name}</td>
                  <td className="p-3 font-mono text-xs">{entry.serial_number}</td>
                  <td className="p-3">{entry.facility_name}</td>
                  <td className="p-3">{entry.location_label}</td>
                  {fields.map((f) => {
                    const value = entry.field_values?.[f.key];
                    const cellRule = !rowRule ? firstMatchingRule(rules, f.key, "cell", value) : null;
                    return (
                      <td key={f.key} className="p-3 whitespace-nowrap"
                        style={cellRule ? { backgroundColor: cellRule.color, color: cellRule.text_color || undefined } : undefined}>
                        {renderCellValue(f, value)}
                      </td>
                    );
                  })}
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(entry)} className="text-xs text-brand-navy hover:underline mr-2">Edit</button>
                    <button onClick={() => handleDelete(entry)} className="text-xs text-brand-red hover:underline">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
