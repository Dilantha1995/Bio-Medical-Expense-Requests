"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMVR } from "@/lib/calc";

function downloadCsv(filename, rows, columns) {
  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escape(c.value(row))).join(","));
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsClient({ session }) {
  const canFilterAll = session.role === "admin" || session.role === "approver";

  const [docType, setDocType] = useState("requests"); // 'requests' | 'bills'
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("");
  const [engineerId, setEngineerId] = useState("");
  const [engineers, setEngineers] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canFilterAll) {
      fetch("/api/engineers").then((r) => r.json()).then((d) => setEngineers(d.engineers || []));
    }
  }, [canFilterAll]);

  async function runReport() {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (company) params.set("company", company);
    if (status) params.set("status", status);
    if (engineerId) params.set("engineerId", engineerId);

    const url = docType === "requests" ? `/api/requests?${params}` : `/api/bills?${params}`;
    const res = await fetch(url);
    const data = await res.json();
    setRows(docType === "requests" ? data.requests || [] : data.bills || []);
    setLoading(false);
  }

  useEffect(() => { runReport(); }, [docType]);

  const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);

  function handleExport() {
    if (docType === "requests") {
      downloadCsv(`advance-requests-${new Date().toISOString().slice(0, 10)}.csv`, rows, [
        { label: "Ref No.", value: (r) => r.ref_number },
        { label: "Engineer", value: (r) => r.engineer_name },
        { label: "Date", value: (r) => new Date(r.request_date).toLocaleDateString() },
        { label: "Company", value: (r) => r.company },
        { label: "Destination", value: (r) => r.destination_label },
        { label: "Total (MVR)", value: (r) => r.total_amount },
        { label: "Status", value: (r) => r.status },
        { label: "Bill Status", value: (r) => r.bill_status },
      ]);
    } else {
      downloadCsv(`bill-summaries-${new Date().toISOString().slice(0, 10)}.csv`, rows, [
        { label: "Ref No.", value: (r) => r.ref_number },
        { label: "Engineer", value: (r) => r.engineer_name },
        { label: "Date", value: (r) => new Date(r.summary_date).toLocaleDateString() },
        { label: "Company", value: (r) => r.company },
        { label: "Destination", value: (r) => r.destination_label },
        { label: "Total (MVR)", value: (r) => r.total_amount },
        { label: "Advance Received", value: (r) => r.advance_received },
        { label: "Balance", value: (r) => r.balance_due },
        { label: "Status", value: (r) => r.status },
      ]);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-brand-navy">Reports</h1>
        <div className="flex gap-2">
          <button onClick={() => setDocType("requests")}
            className={`text-sm px-3 py-1.5 rounded-md ${docType === "requests" ? "bg-brand-navy text-white" : "border"}`}>
            Advance Requests
          </button>
          <button onClick={() => setDocType("bills")}
            className={`text-sm px-3 py-1.5 rounded-md ${docType === "bills" ? "bg-brand-teal text-white" : "border"}`}>
            Bill Summaries
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm grid sm:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border rounded-md px-2 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border rounded-md px-2 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
          <select value={company} onChange={(e) => setCompany(e.target.value)} className="w-full border rounded-md px-2 py-2 text-sm">
            <option value="">All</option>
            <option value="PSMS">PSMS</option>
            <option value="PPM">PPM</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border rounded-md px-2 py-2 text-sm">
            <option value="">All</option>
            <option value="submitted">Submitted</option>
            <option value="checked">Checked</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        {canFilterAll && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Engineer</label>
            <select value={engineerId} onChange={(e) => setEngineerId(e.target.value)} className="w-full border rounded-md px-2 py-2 text-sm">
              <option value="">All</option>
              {engineers.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
        )}
        <div className="sm:col-span-5 flex gap-2">
          <button onClick={runReport} className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium">
            {loading ? "Running..." : "Run Report"}
          </button>
          <button onClick={handleExport} disabled={rows.length === 0} className="border px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-gray-500">Records</p>
          <p className="text-lg font-semibold">{rows.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Amount</p>
          <p className="text-lg font-semibold">MVR {formatMVR(totalAmount)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Ref No.</th>
              <th className="p-3">Engineer</th>
              <th className="p-3">Date</th>
              <th className="p-3">Company</th>
              <th className="p-3">Destination</th>
              <th className="p-3 text-right">Total (MVR)</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-center text-gray-400">No records match these filters.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3">
                  <Link href={docType === "requests" ? `/requests/${r.id}` : `/bills/${r.id}`} className="text-brand-navy hover:underline">
                    {r.ref_number}
                  </Link>
                </td>
                <td className="p-3">{r.engineer_name}</td>
                <td className="p-3">{new Date(r.request_date || r.summary_date).toLocaleDateString()}</td>
                <td className="p-3">{r.company}</td>
                <td className="p-3">{r.destination_label}</td>
                <td className="p-3 text-right">{formatMVR(r.total_amount)}</td>
                <td className="p-3">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
