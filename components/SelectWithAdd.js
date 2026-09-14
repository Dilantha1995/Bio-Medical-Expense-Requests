"use client";

import { useEffect, useState } from "react";

/**
 * A <select> backed by an admin-configurable option_lists list_key. When
 * canAdd is true, an extra "+ Add new..." entry switches the control into
 * an inline text input so whoever's filling in the form can extend the
 * list on the spot instead of being blocked on an admin.
 */
export default function SelectWithAdd({ listKey, value, onChange, canAdd = true, placeholder = "-- select --", className = "" }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");
  const endpoint = `/api/config/options/${listKey}`;

  async function load() {
    setLoading(true);
    const res = await fetch(endpoint);
    const data = await res.json();
    setOptions(data.options || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [listKey]);

  function handleSelect(e) {
    const v = e.target.value;
    if (v === "__add__") {
      setAdding(true);
      setNewLabel("");
      setError("");
      return;
    }
    onChange(v);
  }

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setError("");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.option) {
        onChange(data.option.label);
        setAdding(false);
        load();
        return;
      }
      setError(data.error || "Failed to add.");
      return;
    }
    onChange(data.option.label);
    setAdding(false);
    load();
  }

  if (adding) {
    return (
      <div>
        <div className="flex gap-1">
          <input autoFocus value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New value..." className={`flex-1 border rounded-md px-3 py-2 text-sm ${className}`} />
          <button type="button" onClick={handleAdd} className="text-xs bg-brand-navy text-white px-2 rounded-md whitespace-nowrap">Add</button>
          <button type="button" onClick={() => setAdding(false)} className="text-xs border rounded-md px-2 whitespace-nowrap">Cancel</button>
        </div>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <select value={value || ""} onChange={handleSelect} disabled={loading}
      className={`w-full border rounded-md px-3 py-2 text-sm ${className}`}>
      <option value="">{loading ? "Loading..." : placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
      {value && !options.some((o) => o.label === value) && <option value={value}>{value}</option>}
      {canAdd && <option value="__add__">+ Add new...</option>}
    </select>
  );
}
