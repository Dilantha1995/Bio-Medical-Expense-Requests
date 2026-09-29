"use client";

import { useState } from "react";
import Link from "next/link";

export default function ImportClient() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleImport(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/machines/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Import failed."); setUploading(false); return; }
      setResult(data);
    } catch {
      setError("Something went wrong reading that file.");
    }
    setUploading(false);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-brand-navy">Import Machines from Excel</h1>
        <Link href="/machines" className="text-sm text-brand-navy hover:underline">Back to Machines</Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
        <p className="text-sm text-gray-600">
          Upload the analyzer movement/deliveries workbook. Each worksheet whose name contains
          &quot;PSMS&quot; or &quot;PPM&quot; is scanned for a header row with a <span className="font-medium">Serial Number</span> column;
          rows with a serial number are created as machines (existing serial numbers are skipped, not duplicated).
          The company for each machine is taken from the sheet name, the machine name is matched against known
          models where possible, and the facility comes from the &quot;Current Location&quot; column.
        </p>
        <form onSubmit={handleImport} className="flex flex-col sm:flex-row gap-2">
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="flex-1 text-sm border rounded-md px-3 py-2" />
          <button type="submit" disabled={!file || uploading}
            className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 whitespace-nowrap">
            {uploading ? "Importing..." : "Import"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {result && (
        <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
          <p className="text-sm font-medium">
            Created {result.totalCreated} machine{result.totalCreated === 1 ? "" : "s"}.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="p-2">Sheet</th>
                  <th className="p-2">Company</th>
                  <th className="p-2">Created</th>
                  <th className="p-2">Already existed</th>
                  <th className="p-2">No serial number</th>
                </tr>
              </thead>
              <tbody>
                {result.sheetResults.map((s) => (
                  <tr key={s.sheet} className="border-b last:border-0">
                    <td className="p-2">{s.sheet}</td>
                    <td className="p-2">{s.company}</td>
                    <td className="p-2">{s.created}</td>
                    <td className="p-2">{s.duplicates}</td>
                    <td className="p-2">{s.skippedNoSerial}</td>
                  </tr>
                ))}
                {result.sheetResults.length === 0 && (
                  <tr><td colSpan={5} className="p-2 text-gray-400">No PSMS/PPM sheets with a Serial Number column were found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {result.createdMachines.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs font-medium text-gray-500 mb-1">Newly created machines</p>
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="p-2">Name</th>
                    <th className="p-2">Serial No.</th>
                    <th className="p-2">Company</th>
                    <th className="p-2">Facility</th>
                  </tr>
                </thead>
                <tbody>
                  {result.createdMachines.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="p-2">{m.name}</td>
                      <td className="p-2 font-mono">{m.serial_number}</td>
                      <td className="p-2">{m.company}</td>
                      <td className="p-2">{m.facility_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Link href="/machines" className="inline-block text-sm text-brand-navy hover:underline">View all machines →</Link>
        </div>
      )}
    </div>
  );
}
