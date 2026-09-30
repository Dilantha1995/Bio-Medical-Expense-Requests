"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MachineMap = dynamic(() => import("@/components/MachineMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">Loading map...</div>,
});

export default function LocationClient({ session }) {
  const canManage = session.canManageMachines;
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [flyTarget, setFlyTarget] = useState(null);
  const [placingFor, setPlacingFor] = useState(null); // machine being placed
  const [pendingLatLng, setPendingLatLng] = useState(null);
  const [saving, setSaving] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoProgress, setAutoProgress] = useState(null); // { done, total, matched, unmatched }
  const [propagatedNotice, setPropagatedNotice] = useState("");
  const autoCancelRef = useRef(false);

  useEffect(() => {
    fetch("/api/machines")
      .then((r) => r.json())
      .then((d) => { setMachines(d.machines || []); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return machines;
    return machines.filter((m) =>
      m.name?.toLowerCase().includes(term) ||
      m.serial_number?.toLowerCase().includes(term) ||
      m.facility_name?.toLowerCase().includes(term)
    );
  }, [machines, q]);

  const located = machines.filter((m) => m.latitude !== null && m.latitude !== undefined);
  const unlocatedWithFacility = machines.filter(
    (m) => (m.latitude === null || m.latitude === undefined) && m.facility_name
  );

  function applyServerUpdate(data) {
    const updates = [data.machine, ...(data.propagatedMachines || [])];
    setMachines((list) => list.map((x) => updates.find((u) => u.id === x.id) || x));
    return data.propagatedMachines?.length || 0;
  }

  async function autoLocateAll() {
    const targets = unlocatedWithFacility;
    if (targets.length === 0) return;
    autoCancelRef.current = false;
    setAutoRunning(true);
    setAutoProgress({ done: 0, total: targets.length, matched: 0, unmatched: 0 });

    // Locating a facility (directly or via propagation from a sibling
    // earlier in this same run) means every other machine there is now
    // covered too — skip calling the geocoder again for those.
    const alreadyLocated = new Set();

    for (const m of targets) {
      if (autoCancelRef.current) break;
      if (alreadyLocated.has(m.id)) {
        setAutoProgress((p) => ({ ...p, done: p.done + 1, matched: p.matched + 1 }));
        continue;
      }
      let matched = false;
      try {
        const q = `${m.facility_name}, Maldives`;
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const best = data.results?.[0];
        if (best) {
          const patchRes = await fetch(`/api/machines/${m.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: best.lat, longitude: best.lon }),
          });
          if (patchRes.ok) {
            const data = await patchRes.json();
            applyServerUpdate(data);
            for (const p of data.propagatedMachines || []) alreadyLocated.add(p.id);
            matched = true;
          }
        }
      } catch {
        // leave unmatched, counted below
      }
      setAutoProgress((p) => ({
        ...p,
        done: p.done + 1,
        matched: p.matched + (matched ? 1 : 0),
        unmatched: p.unmatched + (matched ? 0 : 1),
      }));
      // Nominatim's usage policy caps lookups at 1/second.
      if (!autoCancelRef.current) await sleep(1100);
    }
    setAutoRunning(false);
  }

  function cancelAutoLocate() {
    autoCancelRef.current = true;
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchTerm)}`);
    const data = await res.json();
    setSearchResults(data.results || []);
  }

  function goToResult(r) {
    setFlyTarget({ lat: r.lat, lon: r.lon });
  }

  function startPlacing(machine) {
    setPlacingFor(machine);
    setPendingLatLng(machine.latitude ? { lat: Number(machine.latitude), lng: Number(machine.longitude) } : null);
    if (machine.latitude) setFlyTarget({ lat: Number(machine.latitude), lon: Number(machine.longitude) });
  }

  function cancelPlacing() {
    setPlacingFor(null);
    setPendingLatLng(null);
  }

  async function savePending() {
    if (!placingFor || !pendingLatLng) return;
    setSaving(true);
    const res = await fetch(`/api/machines/${placingFor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: pendingLatLng.lat, longitude: pendingLatLng.lng }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      const propagated = applyServerUpdate(data);
      setPlacingFor(null);
      setPendingLatLng(null);
      if (propagated > 0) {
        setPropagatedNotice(
          `Also set the location for ${propagated} other machine${propagated === 1 ? "" : "s"} at ${data.machine.facility_name}.`
        );
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-brand-navy">Location</h1>
        <span className="text-sm text-gray-500">{located.length} of {machines.length} machines plotted</span>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-3">
          {canManage && unlocatedWithFacility.length > 0 && !autoRunning && !autoProgress && (
            <div className="bg-white p-3 rounded-lg shadow-sm space-y-2">
              <p className="text-xs text-gray-600">
                {unlocatedWithFacility.length} machine{unlocatedWithFacility.length === 1 ? "" : "s"} have a facility on
                file but no map pin yet.
              </p>
              <button onClick={autoLocateAll}
                className="text-xs bg-brand-navy text-white px-3 py-1.5 rounded-md">
                Auto-locate from facility name ({unlocatedWithFacility.length})
              </button>
            </div>
          )}

          {(autoRunning || autoProgress) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-2">
              <p className="font-medium">
                {autoRunning ? "Auto-locating..." : "Auto-locate finished"}
                {" "}({autoProgress.done}/{autoProgress.total})
              </p>
              <div className="w-full bg-blue-100 rounded-full h-1.5">
                <div className="bg-brand-navy h-1.5 rounded-full transition-all"
                  style={{ width: `${(autoProgress.done / autoProgress.total) * 100}%` }} />
              </div>
              <p className="text-xs text-gray-600">
                {autoProgress.matched} located automatically, {autoProgress.unmatched} could not be matched (set those
                manually below).
              </p>
              {autoRunning ? (
                <button onClick={cancelAutoLocate} className="text-xs border px-3 py-1.5 rounded-md">Cancel</button>
              ) : (
                <button onClick={() => setAutoProgress(null)} className="text-xs border px-3 py-1.5 rounded-md">Dismiss</button>
              )}
            </div>
          )}

          {propagatedNotice && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-start justify-between gap-2">
              <span>{propagatedNotice}</span>
              <button onClick={() => setPropagatedNotice("")} className="text-green-600 flex-shrink-0">✕</button>
            </div>
          )}

          <form onSubmit={handleSearch} className="bg-white p-3 rounded-lg shadow-sm space-y-2">
            <label className="block text-xs font-medium text-gray-600">Search the map</label>
            <div className="flex gap-2">
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="e.g. Naifaru, Male'..."
                className="flex-1 border rounded-md px-2 py-1.5 text-sm" />
              <button type="submit" className="text-xs border rounded-md px-3">Go</button>
            </div>
            {searchResults.length > 0 && (
              <ul className="text-xs border rounded-md divide-y max-h-40 overflow-auto">
                {searchResults.map((r, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => goToResult(r)} className="w-full text-left px-2 py-1.5 hover:bg-gray-50">
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>

          {placingFor && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-2">
              <p><span className="font-medium">Placing:</span> {placingFor.name} ({placingFor.serial_number})</p>
              <p className="text-xs text-gray-600">Click a point on the map to set its location{pendingLatLng ? ", then Save." : "."}</p>
              {pendingLatLng && <p className="text-xs font-mono text-gray-500">{pendingLatLng.lat.toFixed(5)}, {pendingLatLng.lng.toFixed(5)}</p>}
              <div className="flex gap-2">
                <button onClick={savePending} disabled={!pendingLatLng || saving}
                  className="text-xs bg-brand-navy text-white px-3 py-1.5 rounded-md disabled:opacity-50">
                  {saving ? "Saving..." : "Save location"}
                </button>
                <button onClick={cancelPlacing} className="text-xs border px-3 py-1.5 rounded-md">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-3 border-b">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter machines..."
                className="w-full border rounded-md px-2 py-1.5 text-sm" />
            </div>
            <div className="max-h-[480px] overflow-auto divide-y">
              {loading && <p className="p-3 text-sm text-gray-400">Loading...</p>}
              {!loading && filtered.length === 0 && <p className="p-3 text-sm text-gray-400">No machines found.</p>}
              {filtered.map((m) => (
                <div key={m.id} className="p-3 flex items-center gap-2">
                  {m.picture_data ? (
                    <img src={m.picture_data} alt={m.name} className="h-9 w-9 object-cover rounded border flex-shrink-0" />
                  ) : (
                    <div className="h-9 w-9 rounded border bg-gray-50 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-xs text-gray-500 truncate">{m.facility_name || "No facility set"}</p>
                  </div>
                  {m.latitude !== null && m.latitude !== undefined ? (
                    <button onClick={() => setFlyTarget({ lat: Number(m.latitude), lon: Number(m.longitude) })}
                      className="text-xs text-brand-navy whitespace-nowrap">View</button>
                  ) : null}
                  {canManage && (
                    <button onClick={() => startPlacing(m)} className="text-xs text-brand-navy whitespace-nowrap">
                      {m.latitude !== null && m.latitude !== undefined ? "Move" : "Set"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: "70vh", minHeight: 420 }}>
          <MachineMap machines={machines} flyTarget={flyTarget} placingFor={placingFor} pendingLatLng={pendingLatLng}
            onPick={(latlng) => setPendingLatLng(latlng)} />
        </div>
      </div>
    </div>
  );
}
