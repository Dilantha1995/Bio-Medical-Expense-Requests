"use client";

import { useEffect, useState } from "react";
import { CURRENCIES } from "@/lib/currencies";

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

function OptionListManager({ title, description, endpoint, placeholder }) {
  const [options, setOptions] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(endpoint);
    const data = await res.json();
    setOptions(data.options || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addOption(e) {
    e.preventDefault();
    setError("");
    if (!newLabel.trim()) return;
    const res = await fetch(endpoint, {
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
    if (!window.confirm(`Remove "${opt.label}"?`)) return;
    await fetch(`${endpoint}/${opt.id}`, { method: "DELETE" });
    load();
  }

  async function move(opt, dir) {
    const idx = options.findIndex((o) => o.id === opt.id);
    const other = options[idx + dir];
    if (!other) return;
    await Promise.all([
      fetch(`${endpoint}/${opt.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: other.sort_order }) }),
      fetch(`${endpoint}/${other.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: opt.sort_order }) }),
    ]);
    load();
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-sm font-semibold text-gray-600 mb-3">{title}</h2>
      {description && <p className="text-xs text-gray-400 mb-3">{description}</p>}

      <form onSubmit={addOption} className="flex gap-2 mb-4">
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={placeholder}
          className="flex-1 border rounded-md px-3 py-2 text-sm" />
        <button type="submit" className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium">Add</button>
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : options.length === 0 ? (
        <p className="text-sm text-gray-400">No options yet — add some above.</p>
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
  );
}

export default function ConfigureClient() {
  const [settings, setSettings] = useState({ timezone: "Indian/Maldives", currency: "MVR" });
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    fetch("/api/config/settings").then((r) => r.json()).then((d) => setSettings(d.settings || settings));
  }, []);

  async function saveSetting(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
    await fetch("/api/config/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    setSavedMsg("Saved.");
    setTimeout(() => setSavedMsg(""), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-brand-navy">Configure</h1>

      <div className="bg-white p-4 rounded-lg shadow-sm grid sm:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Date &amp; Time Zone</h2>
          <select value={settings.timezone} onChange={(e) => saveSetting("timezone", e.target.value)}
            className="border rounded-md px-3 py-2 text-sm w-full">
            {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-2">Used for timestamps shown on documents.</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Currency</h2>
          <select value={settings.currency} onChange={(e) => saveSetting("currency", e.target.value)}
            className="border rounded-md px-3 py-2 text-sm w-full">
            {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-2">Used on documents and reports.</p>
        </div>
        {savedMsg && <span className="text-sm text-green-600 sm:col-span-2">{savedMsg}</span>}
      </div>

      <OptionListManager
        title="Nature of Payment (Bill Summary)"
        description="These are the options engineers pick from when itemizing a Bill Summary."
        endpoint="/api/config/nature-of-payment"
        placeholder="e.g. Taxi Fare"
      />

      <OptionListManager
        title="Designations"
        description="Job titles available when adding or editing a user."
        endpoint="/api/config/designations"
        placeholder="e.g. Finance Manager"
      />

      <h2 className="text-lg font-semibold text-brand-navy pt-2">Travel Advance Types</h2>
      <OptionListManager
        title="Type of Travel Advance"
        description="Engineers pick one of these when submitting a new Travel Advance Request."
        endpoint="/api/config/options/travel_advance_type"
        placeholder="e.g. Preventive Maintenance"
      />

      <h2 className="text-lg font-semibold text-brand-navy pt-2">Machines</h2>
      <div className="grid sm:grid-cols-2 gap-6">
        <OptionListManager
          title="Machine Name / Brand"
          description="Used in the Machines form and in PM/Installation/Training log reports."
          endpoint="/api/config/options/machine_name"
          placeholder="e.g. Vitros 350"
        />
        <OptionListManager
          title="Model"
          description="Specific model/variant, used in the Machines form."
          endpoint="/api/config/options/machine_model"
          placeholder="e.g. 350 R"
        />
        <OptionListManager
          title="Category"
          description="Type of analyzer, used in the Machines form and reports."
          endpoint="/api/config/options/machine_category"
          placeholder="e.g. Chemistry Analyzer"
        />
        <OptionListManager
          title="Facility / Customer"
          description="Hospitals/clinics/customers, used in the Machines form."
          endpoint="/api/config/options/machine_facility"
          placeholder="e.g. Naifaru Regional Hospital"
        />
      </div>

      <h2 className="text-lg font-semibold text-brand-navy pt-2">Shipping Expenses</h2>
      <OptionListManager
        title="Type of Expense"
        description="Categories used when itemizing a Shipping Expense Request."
        endpoint="/api/config/options/shipping_expense_type"
        placeholder="e.g. Crane Charge"
      />
    </div>
  );
}
