"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";

const DEFAULT_FIELDS = [
  { label: "Installed On", type: "line" },
  { label: "Last PM Date", type: "line" },
  { label: "Next PM Due", type: "line" },
  { label: "Serviced By", type: "line" },
  { label: "Technician Sign", type: "sign" },
];

export default function StickerGenerator() {
  const [machines, setMachines] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const [heading, setHeading] = useState("PREVENTIVE MAINTENANCE");
  const [sub, setSub] = useState("");
  const [serialLabel, setSerialLabel] = useState("Serial No.");
  const [fields, setFields] = useState(DEFAULT_FIELDS.map((f) => ({ ...f })));
  const [company, setCompany] = useState("psms");
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(2);
  const [rendering, setRendering] = useState(false);
  const [scriptsReady, setScriptsReady] = useState(0);

  async function load(query) {
    setLoading(true);
    const url = query ? `/api/machines?q=${encodeURIComponent(query)}` : "/api/machines";
    const res = await fetch(url);
    const data = await res.json();
    setMachines(data.machines || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      machines.forEach((m) => next.add(m.id));
      return next;
    });
  }
  function clearSelection() { setSelected(new Set()); }

  const selectedMachines = useMemo(
    () => machines.filter((m) => selected.has(m.id)),
    [machines, selected]
  );

  const perSheet = Math.max(1, rows * cols);
  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < selectedMachines.length; i += perSheet) {
      out.push(selectedMachines.slice(i, i + perSheet));
    }
    return out;
  }, [selectedMachines, perSheet]);

  function updateField(i, key, value) {
    setFields((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], [key]: value };
      return next;
    });
  }
  function addField() { setFields((prev) => [...prev, { label: "New Field", type: "line" }]); }
  function removeField(i) { setFields((prev) => prev.filter((_, idx) => idx !== i)); }
  function moveField(i, dir) {
    setFields((prev) => {
      const next = prev.slice();
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const logoSrc = company === "psms" ? "/psms-logo.jpg" : "/propharma-logo.jpg";

  async function handleDownloadPdf() {
    if (typeof window === "undefined" || !window.html2canvas || !window.jspdf) {
      alert("PDF tools are still loading, please try again in a moment.");
      return;
    }
    const sheets = [...document.querySelectorAll(".pm-sheet")];
    if (sheets.length === 0) {
      alert("Select at least one machine first.");
      return;
    }
    setRendering(true);
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      for (let k = 0; k < sheets.length; k++) {
        const canvas = await window.html2canvas(sheets[k], { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
        const img = canvas.toDataURL("image/jpeg", 0.95);
        if (k > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, 210, 297);
      }
      pdf.save("PM_Stickers.pdf");
    } catch (e) {
      alert("PDF generation failed: " + e.message + ". You can still use Print instead.");
    } finally {
      setRendering(false);
    }
  }

  return (
    <div>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" strategy="afterInteractive" onLoad={() => setScriptsReady((n) => n + 1)} />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" strategy="afterInteractive" onLoad={() => setScriptsReady((n) => n + 1)} />

      <style>{`
        .pm-sheet{width:210mm;min-height:297mm;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.12);
          padding:8mm;display:grid;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);
          gap:4mm;margin:0 auto 18px;--fs:2.7mm;}
        .pm-sticker{border:0.4mm solid #c9d4d6;border-radius:2mm;padding:calc(var(--fs)*1.5) calc(var(--fs)*1.65);
          display:flex;flex-direction:column;overflow:hidden;min-height:0;min-width:0;}
        .pm-s-head{display:flex;justify-content:space-between;align-items:flex-start;gap:calc(var(--fs)*0.8)}
        .pm-s-logo{height:calc(var(--fs)*3.3);width:auto;max-width:58%;object-fit:contain}
        .pm-s-serial{border:0.4mm solid #1f3b44;border-radius:1.4mm;padding:calc(var(--fs)*0.38) calc(var(--fs)*0.75);text-align:right;line-height:1.1;flex:0 0 auto}
        .pm-s-serial-label{display:block;font-size:calc(var(--fs)*0.74);color:#6b7d82;letter-spacing:.05em}
        .pm-s-serial-no{display:block;font-family:Consolas,monospace;font-size:calc(var(--fs)*1.1);font-weight:700;color:#1f3b44;white-space:nowrap}
        .pm-s-title{font-size:calc(var(--fs)*1.6);font-weight:800;color:#1f3b44;letter-spacing:.02em;margin-top:calc(var(--fs)*0.55);line-height:1.05}
        .pm-s-sub{font-size:calc(var(--fs)*0.85);color:#6b7d82;text-transform:uppercase;letter-spacing:.14em;border-bottom:0.3mm solid #e2e8e9;padding-bottom:calc(var(--fs)*0.37);margin-bottom:calc(var(--fs)*0.37)}
        .pm-s-fields{flex:1;display:flex;flex-direction:column;justify-content:space-around;padding-top:calc(var(--fs)*0.2);min-height:0}
        .pm-s-field{display:flex;align-items:flex-end;gap:calc(var(--fs)*0.55)}
        .pm-s-field.sign{margin-top:calc(var(--fs)*0.4)}
        .pm-s-label{font-size:var(--fs);color:#1f3b44;white-space:nowrap}
        .pm-s-line{flex:1;border-bottom:0.3mm dotted #9bacb1;height:calc(var(--fs)*1.1)}
        .pm-s-field.sign .pm-s-line{border-bottom-style:solid;height:calc(var(--fs)*1.85)}
        @media print{
          body *{visibility:hidden}
          .pm-print-area, .pm-print-area *{visibility:visible}
          .pm-print-area{position:absolute;left:0;top:0}
          .pm-sheet{box-shadow:none;page-break-after:always;margin:0}
        }
      `}</style>

      <div className="print:hidden space-y-4 mb-6">
        <h1 className="text-xl font-semibold text-brand-navy">PM Sticker Printing</h1>

        <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search machines by name, serial, facility..."
              className="flex-1 border rounded-md px-3 py-2 text-sm" />
            <button onClick={() => load(q)} className="text-sm border rounded-md px-4">Search</button>
            <button onClick={selectAllVisible} className="text-sm border rounded-md px-4">Select all shown</button>
            <button onClick={clearSelection} className="text-sm border rounded-md px-4">Clear</button>
          </div>
          <div className="max-h-56 overflow-auto border rounded-md">
            <table className="min-w-full text-xs">
              <tbody>
                {loading && <tr><td className="p-3 text-gray-400">Loading...</td></tr>}
                {!loading && machines.length === 0 && <tr><td className="p-3 text-gray-400">No machines found. Add machines first.</td></tr>}
                {machines.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-2 w-8">
                      <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
                    </td>
                    <td className="p-2 font-medium">{m.name}</td>
                    <td className="p-2 font-mono">{m.serial_number}</td>
                    <td className="p-2 text-gray-500">{m.facility_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">{selectedMachines.length} machine(s) selected · {pages.length} page(s)</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm grid sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Logo / Company</label>
            <select value={company} onChange={(e) => setCompany(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm">
              <option value="psms">ProSynergy (PSMS)</option>
              <option value="ppm">Pro Pharma (PPM)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Heading</label>
            <input value={heading} onChange={(e) => setHeading(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sub-heading</label>
            <input value={sub} onChange={(e) => setSub(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Serial label</label>
            <input value={serialLabel} onChange={(e) => setSerialLabel(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rows per sheet</label>
            <input type="number" min={1} max={12} value={rows} onChange={(e) => setRows(parseInt(e.target.value) || 1)} className="w-full border rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Columns per sheet</label>
            <input type="number" min={1} max={8} value={cols} onChange={(e) => setCols(parseInt(e.target.value) || 1)} className="w-full border rounded-md px-2 py-1.5 text-sm" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-xs font-semibold text-gray-600 mb-2">Sticker fields (rename, reorder, mark as signature line)</p>
          <div className="space-y-1">
            {fields.map((f, i) => (
              <div key={i} className="flex items-center gap-2 border rounded-md p-1.5">
                <input value={f.label} onChange={(e) => updateField(i, "label", e.target.value)} className="flex-1 border rounded px-2 py-1 text-xs" />
                <label className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                  <input type="checkbox" checked={f.type === "sign"} onChange={(e) => updateField(i, "type", e.target.checked ? "sign" : "line")} /> sign
                </label>
                <button onClick={() => moveField(i, -1)} className="text-xs border rounded px-2">↑</button>
                <button onClick={() => moveField(i, 1)} className="text-xs border rounded px-2">↓</button>
                <button onClick={() => removeField(i)} className="text-xs text-brand-red border rounded px-2">✕</button>
              </div>
            ))}
          </div>
          <button onClick={addField} className="text-sm text-brand-navy hover:underline mt-2">+ Add field</button>
        </div>

        <div className="flex gap-2">
          <button onClick={handleDownloadPdf} disabled={rendering || scriptsReady < 2}
            className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
            {rendering ? "Rendering..." : "Download PDF"}
          </button>
          <button onClick={() => window.print()} className="border px-4 py-2 rounded-md text-sm">Print</button>
        </div>
      </div>

      <div className="pm-print-area">
        {pages.map((pageMachines, pIdx) => (
          <div key={pIdx} className="pm-sheet">
            {pageMachines.map((m) => (
              <div key={m.id} className="pm-sticker">
                <div className="pm-s-head">
                  <img className="pm-s-logo" src={logoSrc} alt="" />
                  <div className="pm-s-serial">
                    <span className="pm-s-serial-label">{serialLabel}</span>
                    <span className="pm-s-serial-no">{m.serial_number}</span>
                  </div>
                </div>
                <div className="pm-s-title">{heading}</div>
                <div className="pm-s-sub">{sub || m.name}</div>
                <div className="pm-s-fields">
                  {fields.map((f, fi) => (
                    <div key={fi} className={`pm-s-field ${f.type === "sign" ? "sign" : ""}`}>
                      <span className="pm-s-label">{f.label}</span>
                      <span className="pm-s-line" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
