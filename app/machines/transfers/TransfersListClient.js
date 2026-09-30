"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TransfersListClient() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/machines/transfers")
      .then((r) => r.json())
      .then((d) => { setTransfers(d.transfers || []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-brand-navy">Transfer History</h1>
        <Link href="/machines" className="text-sm text-brand-navy hover:underline">Back to Machines</Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Ref No.</th>
              <th className="p-3">Machine</th>
              <th className="p-3">From</th>
              <th className="p-3">To</th>
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="p-4 text-center text-gray-400">Loading...</td></tr>}
            {!loading && transfers.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-gray-400">No transfers yet.</td></tr>
            )}
            {transfers.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                onClick={() => { window.location.href = `/machines/transfers/${t.id}`; }}>
                <td className="p-3 font-mono text-xs">
                  <Link href={`/machines/transfers/${t.id}`} className="text-brand-navy hover:underline" onClick={(e) => e.stopPropagation()}>
                    {t.ref_number}
                  </Link>
                </td>
                <td className="p-3">{t.machine_name} ({t.machine_serial_number})</td>
                <td className="p-3">{t.from_facility_name || "-"}</td>
                <td className="p-3">{t.to_facility_name}</td>
                <td className="p-3">{t.transfer_date ? new Date(t.transfer_date).toLocaleDateString() : "-"}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === "received" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>
                    {t.status === "received" ? "Received" : "In Transit"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
