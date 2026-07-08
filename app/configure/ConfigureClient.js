"use client";

import { useEffect, useState } from "react";

const TIMEZONES = [
  { value: "Indian/Maldives", label: "Maldives (UTC+05:00)" },
  { value: "Asia/Colombo", label: "Sri Lanka (UTC+05:30)" },
  { value: "Asia/Kolkata", label: "India (UTC+05:30)" },
  { value: "Asia/Karachi", label: "Pakistan (UTC+05:00)" },
  { value: "Asia/Dhaka", label: "Bangladesh (UTC+06:00)" },
  { value: "Asia/Dubai", label: "UAE (UTC+04:00)" },
  { value: "Asia/Singapore", label: "Singapore (UTC+08:00)" },
  { value: "UTC", label: "UTC" },
];

export default function ConfigureClient() {
  const [options, setOptions] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [settings, setSettings] = useState({ timezone: "Indian/Maldives" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  async function load() {
    setLoading(true);
    const [oRes, sRes] = await Promise.all([
      fetch("/api/config/nature-of-payment"),
      fetch("/api/config/settings"),
    ]);
    const oData = await oRes.json();
    const sData = await sRes.json();
    setOptions(oData.options || []);
    setSettings(sData.settings || { timezone: "Indian/Maldives" });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addOption(e) {
    e.preventDefault();
    setError("");
    if (!newLabel.trim()) return;
    const res = await fetch("/api/config/nature-of-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to add."); return; }
    setNewLabel("");
    load();
  }

  async function removeOption(opt) {
    if (!window.confirm(`Remove "${opt.label}" from the list?`)) return;
    await fetch(`/api/config/nature-of-payment/${opt.id}`, { method: "DELETE" });
    load();
  }

  async function move(opt, dir) {
    const idx = options.findIndex((o) => o.id === opt.id);
    const other = options[idx + dir];
    if (!other) return;
    await Promise.all([
      fetch(`/api/config/nature-of-payment/${opt.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: other.sort_order }) }),
      fetch(`/api/config/nature-of-payment/${other.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: opt.sort_order }) }),
    ]);
    load();
  }

  async function saveTimezone(tz) {
    setSettings((s) => ({ ...s, timezone: tz }));
    await fetch("/api/config/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: tz }),
    });
    setSavedMsg("Saved.");
    setTimeout(() => setSavedMsg(""), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-brand-navy">Configure</h1>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">Date &amp; Time Zone</h2>
        <div className="flex items-center gap-3">
          <select value={settings.timezone} onChange={(e) => saveTimezone(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm">
            {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
          {savedMsg && <span className="text-sm text-green-600">{savedMsg}</span>}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Used for timestamps shown on documents (Prepared/Checked/Approved dates).
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">Nature of Payment (Bill Summary)</h2>
        <p className="text-xs text-gray-400 mb-3">These are the options engineers pick from when itemizing a Bill Summary.</p>

        <form onSubmit={addOption} className="flex gap-2 mb-4">
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Taxi Fare"
            className="flex-1 border rounded-md px-3 py-2 text-sm" />
          <button type="submit" className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium">Add</button>
        </form>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-gray-400">No options yet — add some above (e.g. Taxi Fare, Accommodation, Sea Transport, Food).</p>
        ) : (
          <div className="space-y-1">
            {options.map((opt, i) => (
              <div key={opt.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <span className="text-sm">{opt.label}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => move(opt, -1)} disabled={i === 0} className="text-xs border rounded px-2 disabled:opacity-30">↑</button>
                  <button onClick={() => move(opt, 1)} disabled={i === options.length - 1} className="text-xs border rounded px-2 disabled:opacity-30">↓</button>
                  <button onClick={() => removeOption(opt)} className="text-xs text-brand-red ml-2">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
