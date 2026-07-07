"use client";

import { useMemo, useRef, useState } from "react";
import MALDIVES_ISLANDS from "@/lib/maldivesIslands";

export default function LocationPicker({ value, onChange, placeholder = "Search island..." }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MALDIVES_ISLANDS.slice(0, 8);
    return MALDIVES_ISLANDS
      .filter((i) => i.island.toLowerCase().includes(q) || i.atollName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query]);

  function choose(item) {
    const label = `${item.island}, ${item.atoll}`;
    setQuery(label);
    onChange(label);
    setOpen(false);
  }

  function handleChange(e) {
    const v = e.target.value;
    setQuery(v);
    onChange(v); // allow free text even if it doesn't match the list
    setOpen(true);
  }

  return (
    <div className="relative">
      <input
        className="w-full border rounded px-2 py-1 text-xs"
        value={query}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimeout.current = setTimeout(() => setOpen(false), 150); }}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-56 max-h-56 overflow-auto bg-white border rounded-md shadow-lg text-xs">
          {results.map((item) => (
            <li key={`${item.atoll}-${item.island}`}>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(item)}
              >
                <span className="font-medium">{item.island}</span>
                <span className="text-gray-400"> — {item.atollName} ({item.atoll})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
