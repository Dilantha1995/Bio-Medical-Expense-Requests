"use client";

import { useRef, useState } from "react";

/**
 * Optional link from a travel leg to a specific registered machine, so
 * reports can answer "PM log for this island / brand / analyzer". Search
 * combobox in the same interaction shape as LocationPicker, but backed by
 * /api/machines instead of a static island list.
 */
export default function MachinePicker({ machineId, machineLabel, onChange, placeholder = "Search machine..." }) {
  const [query, setQuery] = useState(machineLabel || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef(null);
  const debounceRef = useRef(null);

  function handleChange(e) {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    if (machineId) onChange({ machineId: null, machineLabel: v });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!v.trim()) { setResults([]); return; }
      const res = await fetch(`/api/machines?q=${encodeURIComponent(v)}`);
      const data = await res.json();
      setResults((data.machines || []).slice(0, 8));
    }, 250);
  }

  function choose(m) {
    const label = `${m.name}${m.model ? ` (${m.model})` : ""} — ${m.serial_number}`;
    setQuery(label);
    onChange({ machineId: m.id, machineLabel: label });
    setOpen(false);
  }

  function clear() {
    setQuery("");
    onChange({ machineId: null, machineLabel: "" });
  }

  return (
    <div className="relative">
      <div className="flex gap-1">
        <input
          className="w-full border rounded px-2 py-1 text-xs"
          value={query}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={() => { blurTimeout.current = setTimeout(() => setOpen(false), 150); }}
        />
        {query && (
          <button type="button" onClick={clear} className="text-xs text-gray-400 px-1" title="Clear">×</button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-64 max-h-56 overflow-auto bg-white border rounded-md shadow-lg text-xs">
          {results.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(m)}
              >
                <span className="font-medium">{m.name}{m.model ? ` (${m.model})` : ""}</span>
                <span className="text-gray-400"> — {m.serial_number}{m.facility_name ? `, ${m.facility_name}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
