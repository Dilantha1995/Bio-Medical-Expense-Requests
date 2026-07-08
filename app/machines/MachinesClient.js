"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LocationPicker from "@/components/LocationPicker";

function emptyForm() {
  return { name: "", model: "", serialNumber: "", category: "", facilityName: "", locationLabel: "", installDate: "", notes: "" };
}

export default function MachinesClient({ session }) {
  const canManage = session.role === "admin" || session.canManageMachines;
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [prefix, setPrefix] = useState("PSMS-PM-");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function load(query) {
    setLoading(true);
    const url = query ? `/api/machines?q=${encodeURIComponent(query)}` : "/api/machines";
    const res = await fetch(url);
    const data = await res.json();
    setMachines(data.machines || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleSearch(e) {
    e.preventDefault();
    load(q);
  }

  async function handleGenerateSerial() {
    setGenerating(true);
    const res = await fetch("/api/machines/next-serial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, pad: 4 }),
    });
    const data = await res.json();
    setGenerating(false);
    if (res.ok) setForm((f) => ({ ...f, serialNumber: data.serial }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/machines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to add machine."); return; }
    setForm(emptyForm());
    setShowForm(false);
    load(q);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-brand-navy">Machines</h1>
        <div className="flex gap-2">
          <Link href="/machines/stickers" className="text-sm border border-brand-navy text-brand-navy px-3 py-1.5 rounded-md">
            Print PM Stickers
          </Link>
          {canManage && (
            <button onClick={() => setShowForm((s) => !s)} className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded-md">
              {showForm ? "Cancel" : "+ Add Machine"}
            </button>
          )}
        </div>
      </div>

      {showForm && canManage && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Machine Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Vitros 350" className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
            <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Chemistry Analyzer" className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Serial Number</label>
            <div className="flex gap-2">
              <input required value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                className="flex-1 border rounded-md px-3 py-2 text-sm" />
              <button type="button" onClick={handleGenerateSerial} disabled={generating}
                className="text-xs border rounded-md px-3 whitespace-nowrap disabled:opacity-50">
                {generating ? "..." : "Auto-generate"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Serial Prefix (for auto-generate)</label>
            <select value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="PSMS-PM-">PSMS-PM-</option>
              <option value="PPM-PM-">PPM-PM-</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Facility / Customer</label>
            <input value={form.facilityName} onChange={(e) => setForm({ ...form, facilityName: e.target.value })}
              placeholder="e.g. Naifaru Regional Hospital" className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <LocationPicker value={form.locationLabel} onChange={(v) => setForm({ ...form, locationLabel: v })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Install Date</label>
            <input type="date" value={form.installDate} onChange={(e) => setForm({ ...form, installDate: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>

          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <div className="sm:col-span-3">
            <button type="submit" disabled={saving} className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
              {saving ? "Saving..." : "Add Machine"}
            </button>
          </div>
        </form>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, serial, facility, or island..."
          className="flex-1 border rounded-md px-3 py-2 text-sm" />
        <button type="submit" className="text-sm border rounded-md px-4">Search</button>
      </form>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-2">
        {loading && <p className="bg-white rounded-lg shadow-sm p-4 text-center text-gray-400 text-sm">Loading...</p>}
        {!loading && machines.length === 0 && (
          <p className="bg-white rounded-lg shadow-sm p-4 text-center text-gray-400 text-sm">No machines yet.</p>
        )}
        {machines.map((m) => (
          <div key={m.id} className="bg-white rounded-lg shadow-sm p-3">
            <div className="font-medium text-sm">{m.name}{m.model ? ` (${m.model})` : ""}</div>
            <div className="font-mono text-xs text-gray-500 mt-0.5">{m.serial_number}</div>
            <div className="text-sm text-gray-600 mt-1">{m.facility_name}{m.facility_name && m.location_label ? " · " : ""}{m.location_label}</div>
            <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
              <span>{m.category}</span>
              <span>{m.install_date ? new Date(m.install_date).toLocaleDateString() : ""}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tablet+: table */}
      <div className="hidden sm:block bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Name</th>
              <th className="p-3">Serial No.</th>
              <th className="p-3">Category</th>
              <th className="p-3">Facility</th>
              <th className="p-3">Location</th>
              <th className="p-3">Installed</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="p-4 text-center text-gray-400">Loading...</td></tr>}
            {!loading && machines.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-gray-400">No machines yet.</td></tr>
            )}
            {machines.map((m) => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3 font-medium">{m.name}{m.model ? ` (${m.model})` : ""}</td>
                <td className="p-3 font-mono text-xs">{m.serial_number}</td>
                <td className="p-3">{m.category}</td>
                <td className="p-3">{m.facility_name}</td>
                <td className="p-3">{m.location_label}</td>
                <td className="p-3">{m.install_date ? new Date(m.install_date).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
