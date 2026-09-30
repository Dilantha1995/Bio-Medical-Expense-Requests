"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LocationPicker from "@/components/LocationPicker";
import SelectWithAdd from "@/components/SelectWithAdd";
import { resizeImageFile } from "@/lib/imageResize";

function emptyForm() {
  return { name: "", model: "", serialNumber: "", category: "", facilityName: "", locationLabel: "", installDate: "", notes: "", company: "PSMS", pictureData: "" };
}

function CompanyMiniSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
      <option value="PSMS">PSMS</option>
      <option value="PPM">PPM</option>
    </select>
  );
}

function PictureField({ value, onChange }) {
  const [error, setError] = useState("");
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const dataUrl = await resizeImageFile(file, 400, 0.85);
      onChange(dataUrl);
    } catch {
      setError("Could not read that image.");
    }
  }
  return (
    <div>
      <div className="flex items-center gap-2">
        {value ? (
          <img src={value} alt="Machine" className="h-12 w-12 object-cover rounded border" />
        ) : (
          <div className="h-12 w-12 rounded border bg-gray-50 flex items-center justify-center text-[10px] text-gray-400">No photo</div>
        )}
        <input type="file" accept="image/*" onChange={handleFile} className="text-xs flex-1" />
        {value && (
          <button type="button" onClick={() => onChange("")} className="text-xs text-red-600 whitespace-nowrap">Remove</button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function EditMachineModal({ machine, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: machine.name || "",
    model: machine.model || "",
    category: machine.category || "",
    facilityName: machine.facility_name || "",
    locationLabel: machine.location_label || "",
    installDate: machine.install_date ? machine.install_date.slice(0, 10) : "",
    notes: machine.notes || "",
    company: machine.company || "PSMS",
    pictureData: machine.picture_data || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/machines/${machine.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to save."); return; }
    onSaved(data.machine);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
      <form onSubmit={handleSave} className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-auto p-4 sm:p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-navy">Edit Machine</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-2 -mr-2">✕</button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Picture</label>
          <PictureField value={form.pictureData} onChange={(v) => setForm({ ...form, pictureData: v })} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Machine Name</label>
            <SelectWithAdd listKey="machine_name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
            <CompanyMiniSelect value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
            <SelectWithAdd listKey="machine_model" value={form.model} onChange={(v) => setForm({ ...form, model: v })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <SelectWithAdd listKey="machine_category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Facility / Customer</label>
            <SelectWithAdd listKey="machine_facility" value={form.facilityName} onChange={(v) => setForm({ ...form, facilityName: v })} />
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
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>

        <p className="text-xs text-gray-400">Map location (for the Location tab) is set from the Location page, not here.</p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm border px-4 py-2 rounded-md">Cancel</button>
          <button type="submit" disabled={saving} className="text-sm bg-brand-navy text-white px-4 py-2 rounded-md disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TransferMachineModal({ machine, onClose }) {
  const router = useRouter();
  const [toFacilityName, setToFacilityName] = useState("");
  const [toLocationLabel, setToLocationLabel] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/machines/${machine.id}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toFacilityName, toLocationLabel, transferDate, reason }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to create transfer."); return; }
    router.push(`/machines/transfers/${data.transfer.id}`);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-navy">Transfer Machine</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-2 -mr-2">✕</button>
        </div>
        <p className="text-sm text-gray-600">
          {machine.name} ({machine.serial_number}) — currently at {machine.facility_name || "no facility set"}
        </p>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Transfer To (Facility)</label>
          <SelectWithAdd listKey="machine_facility" value={toFacilityName} onChange={setToFacilityName} placeholder="Destination facility" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
          <LocationPicker value={toLocationLabel} onChange={setToLocationLabel} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Transfer Date</label>
          <input type="date" required value={transferDate} onChange={(e) => setTransferDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm border px-4 py-2 rounded-md">Cancel</button>
          <button type="submit" disabled={saving || !toFacilityName} className="text-sm bg-brand-navy text-white px-4 py-2 rounded-md disabled:opacity-50">
            {saving ? "Transferring..." : "Transfer & Generate Document"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function MachinesClient({ session }) {
  const canManage = session.canManageMachines;
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [prefix, setPrefix] = useState("PSMS-PM-");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [transferring, setTransferring] = useState(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillNotice, setBackfillNotice] = useState("");

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

  async function handleBackfillPictures() {
    setBackfilling(true);
    setBackfillNotice("");
    const res = await fetch("/api/machines/backfill-pictures", { method: "POST" });
    const data = await res.json();
    setBackfilling(false);
    if (res.ok) {
      setBackfillNotice(`Set a default photo for ${data.updated} of ${data.checked} machine${data.checked === 1 ? "" : "s"} that had none.`);
      load(q);
    } else {
      setBackfillNotice(data.error || "Failed to fill in default pictures.");
    }
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

  function handleSaved(updated) {
    setMachines((list) => list.map((m) => (m.id === updated.id ? updated : m)));
    setEditing(null);
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
            <Link href="/machines/import" className="text-sm border border-brand-navy text-brand-navy px-3 py-1.5 rounded-md">
              Import from Excel
            </Link>
          )}
          <Link href="/machines/transfers" className="text-sm border border-brand-navy text-brand-navy px-3 py-1.5 rounded-md">
            Transfer History
          </Link>
          {canManage && (
            <button onClick={handleBackfillPictures} disabled={backfilling}
              className="text-sm border border-brand-navy text-brand-navy px-3 py-1.5 rounded-md disabled:opacity-50">
              {backfilling ? "Filling in..." : "Fill Missing Pictures"}
            </button>
          )}
          {canManage && (
            <button onClick={() => setShowForm((s) => !s)} className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded-md">
              {showForm ? "Cancel" : "+ Add Machine"}
            </button>
          )}
        </div>
      </div>

      {backfillNotice && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-start justify-between gap-2">
          <span>{backfillNotice}</span>
          <button onClick={() => setBackfillNotice("")} className="text-green-600 flex-shrink-0">✕</button>
        </div>
      )}

      {showForm && canManage && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Picture</label>
            <PictureField value={form.pictureData} onChange={(v) => setForm({ ...form, pictureData: v })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Machine Name</label>
            <SelectWithAdd listKey="machine_name" value={form.name} onChange={(v) => setForm({ ...form, name: v })}
              placeholder="e.g. Vitros 350" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
            <SelectWithAdd listKey="machine_model" value={form.model} onChange={(v) => setForm({ ...form, model: v })}
              placeholder="Select or add a model" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <SelectWithAdd listKey="machine_category" value={form.category} onChange={(v) => setForm({ ...form, category: v })}
              placeholder="e.g. Chemistry Analyzer" />
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
            <CompanyMiniSelect value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Facility / Customer</label>
            <SelectWithAdd listKey="machine_facility" value={form.facilityName} onChange={(v) => setForm({ ...form, facilityName: v })}
              placeholder="e.g. Naifaru Regional Hospital" />
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
          <div key={m.id} className="bg-white rounded-lg shadow-sm p-3 flex gap-3">
            {m.picture_data ? (
              <img src={m.picture_data} alt={m.name} className="h-12 w-12 object-cover rounded border flex-shrink-0" />
            ) : (
              <div className="h-12 w-12 rounded border bg-gray-50 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm truncate">{m.name}{m.model ? ` (${m.model})` : ""}</div>
                {canManage && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setTransferring(m)} className="text-xs text-brand-navy">Transfer</button>
                    <button onClick={() => setEditing(m)} className="text-xs text-brand-navy">Edit</button>
                  </div>
                )}
              </div>
              <div className="font-mono text-xs text-gray-500 mt-0.5">{m.serial_number} · {m.company}</div>
              <div className="text-sm text-gray-600 mt-1">{m.facility_name}{m.facility_name && m.location_label ? " · " : ""}{m.location_label}</div>
              <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                <span>{m.category}</span>
                <span>{m.install_date ? new Date(m.install_date).toLocaleDateString() : ""}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tablet+: table */}
      <div className="hidden sm:block bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3"></th>
              <th className="p-3">Name</th>
              <th className="p-3">Serial No.</th>
              <th className="p-3">Company</th>
              <th className="p-3">Category</th>
              <th className="p-3">Facility</th>
              <th className="p-3">Location</th>
              <th className="p-3">Installed</th>
              {canManage && <th className="p-3"></th>}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="p-4 text-center text-gray-400">Loading...</td></tr>}
            {!loading && machines.length === 0 && (
              <tr><td colSpan={9} className="p-4 text-center text-gray-400">No machines yet.</td></tr>
            )}
            {machines.map((m) => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3">
                  {m.picture_data ? (
                    <img src={m.picture_data} alt={m.name} className="h-9 w-9 object-cover rounded border" />
                  ) : (
                    <div className="h-9 w-9 rounded border bg-gray-50" />
                  )}
                </td>
                <td className="p-3 font-medium">{m.name}{m.model ? ` (${m.model})` : ""}</td>
                <td className="p-3 font-mono text-xs">{m.serial_number}</td>
                <td className="p-3">{m.company}</td>
                <td className="p-3">{m.category}</td>
                <td className="p-3">{m.facility_name}</td>
                <td className="p-3">{m.location_label}</td>
                <td className="p-3">{m.install_date ? new Date(m.install_date).toLocaleDateString() : "-"}</td>
                {canManage && (
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => setTransferring(m)} className="text-xs text-brand-navy mr-3">Transfer</button>
                    <button onClick={() => setEditing(m)} className="text-xs text-brand-navy">Edit</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <EditMachineModal machine={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
      {transferring && <TransferMachineModal machine={transferring} onClose={() => setTransferring(null)} />}
    </div>
  );
}
