"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMVR } from "@/lib/calc";
import { downloadCsv } from "@/lib/csv";

const DOC_TYPES = [
  { key: "requests", label: "Advance Requests" },
  { key: "bills", label: "Bill Summaries" },
  { key: "shipping", label: "Shipping Expenses" },
  { key: "activity", label: "Activity Log" },
  { key: "performance", label: "Engineer Performance" },
];

export default function ReportsClient({ session }) {
  const canFilterAll = session.role === "admin" || session.role === "approver";

  const [docType, setDocType] = useState("requests");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("");
  const [engineerId, setEngineerId] = useState("");
  const [requestType, setRequestType] = useState("");
  const [island, setIsland] = useState("");
  const [machineCategory, setMachineCategory] = useState("");
  const [machineName, setMachineName] = useState("");
  const [engineers, setEngineers] = useState([]);
  const [requestTypeOptions, setRequestTypeOptions] = useState([]);
  const [machineCategoryOptions, setMachineCategoryOptions] = useState([]);
  const [machineNameOptions, setMachineNameOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState("MVR");

  useEffect(() => {
    fetch("/api/config/settings").then((r) => r.json()).then((d) => setCurrency(d.settings?.currency || "MVR"));
  }, []);

  useEffect(() => {
    if (canFilterAll) {
      fetch("/api/engineers").then((r) => r.json()).then((d) => setEngineers(d.engineers || []));
    }
  }, [canFilterAll]);

  useEffect(() => {
    fetch("/api/config/options/travel_advance_type").then((r) => r.json()).then((d) => setRequestTypeOptions(d.options || []));
    fetch("/api/config/options/machine_category").then((r) => r.json()).then((d) => setMachineCategoryOptions(d.options || []));
    fetch("/api/config/options/machine_name").then((r) => r.json()).then((d) => setMachineNameOptions(d.options || []));
  }, []);

  async function runReport() {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (engineerId) params.set("engineerId", engineerId);

    let url;
    if (docType === "requests" || docType === "bills" || docType === "shipping") {
      if (company) params.set("company", company);
      if (status) params.set("status", status);
      url = docType === "requests" ? `/api/requests?${params}` : docType === "bills" ? `/api/bills?${params}` : `/api/shipping?${params}`;
    } else if (docType === "activity") {
      if (company) params.set("company", company);
      if (requestType) params.set("requestType", requestType);
      if (island) params.set("island", island);
      if (machineCategory) params.set("machineCategory", machineCategory);
      if (machineName) params.set("machineName", machineName);
      url = `/api/reports/activity-log?${params}`;
    } else {
      url = `/api/reports/engineer-performance?${params}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    if (docType === "requests") setRows(data.requests || []);
    else if (docType === "bills") setRows(data.bills || []);
    else if (docType === "shipping") setRows(data.shipping || []);
    else setRows(data.rows || []);
    setLoading(false);
  }

  useEffect(() => { runReport(); }, [docType]);

  const totalAmount = ["requests", "bills", "shipping"].includes(docType)
    ? rows.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0)
    : 0;

  function handleExport() {
    if (docType === "requests") {
      downloadCsv(`advance-requests-${new Date().toISOString().slice(0, 10)}.csv`, rows, [
        { label: "Ref No.", value: (r) => r.ref_number },
        { label: "Engineer", value: (r) => r.engineer_name },
        { label: "Date", value: (r) => new Date(r.request_date).toLocaleDateString() },
        { label: "Type", value: (r) => r.request_type },
        { label: "Company", value: (r) => r.company },
        { label: "Destination", value: (r) => r.destination_label },
        { label: `Total (${currency})`, value: (r) => r.total_amount },
        { label: "Status", value: (r) => r.status },
        { label: "Bill Status", value: (r) => r.bill_status },
      ]);
    } else if (docType === "bills") {
      downloadCsv(`bill-summaries-${new Date().toISOString().slice(0, 10)}.csv`, rows, [
        { label: "Ref No.", value: (r) => r.ref_number },
        { label: "Engineer", value: (r) => r.engineer_name },
        { label: "Date", value: (r) => new Date(r.summary_date).toLocaleDateString() },
        { label: "Company", value: (r) => r.company },
        { label: "Destination", value: (r) => r.destination_label },
        { label: `Total (${currency})`, value: (r) => r.total_amount },
        { label: "Advance Received", value: (r) => r.advance_received },
        { label: "Balance", value: (r) => r.balance_due },
        { label: "Status", value: (r) => r.status },
      ]);
    } else if (docType === "shipping") {
      downloadCsv(`shipping-expenses-${new Date().toISOString().slice(0, 10)}.csv`, rows, [
        { label: "Ref No.", value: (r) => r.ref_number },
        { label: "Engineer", value: (r) => r.engineer_name },
        { label: "Date", value: (r) => new Date(r.request_date).toLocaleDateString() },
        { label: "Company", value: (r) => r.company },
        { label: `Total (${currency})`, value: (r) => r.total_amount },
        { label: "Status", value: (r) => r.status },
      ]);
    } else if (docType === "activity") {
      downloadCsv(`activity-log-${new Date().toISOString().slice(0, 10)}.csv`, rows, [
        { label: "Ref No.", value: (r) => r.ref_number },
        { label: "Type", value: (r) => r.request_type },
        { label: "Engineer", value: (r) => r.engineer_name },
        { label: "Date", value: (r) => new Date(r.request_date).toLocaleDateString() },
        { label: "From", value: (r) => r.from_location },
        { label: "To", value: (r) => r.to_location },
        { label: "Machine", value: (r) => r.machine_name },
        { label: "Model", value: (r) => r.machine_model },
        { label: "Category", value: (r) => r.machine_category },
        { label: "Serial", value: (r) => r.machine_serial },
        { label: "Facility", value: (r) => r.machine_facility },
        { label: "Status", value: (r) => r.status },
      ]);
    } else {
      downloadCsv(`engineer-performance-${new Date().toISOString().slice(0, 10)}.csv`, rows, [
        { label: "Engineer", value: (r) => r.engineerName },
        { label: "PM", value: (r) => r.pmCount },
        { label: "Installation", value: (r) => r.installationCount },
        { label: "Training", value: (r) => r.trainingCount },
        { label: "Other", value: (r) => r.otherCount },
        { label: `Advance Total (${currency})`, value: (r) => r.advanceTotal.toFixed(2) },
        { label: `Bill Total (${currency})`, value: (r) => r.billTotal.toFixed(2) },
        { label: `Shipping Total (${currency})`, value: (r) => r.shippingTotal.toFixed(2) },
        { label: `Grand Total (${currency})`, value: (r) => r.grandTotal.toFixed(2) },
      ]);
    }
  }

  const isDocList = ["requests", "bills", "shipping"].includes(docType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-brand-navy">Reports</h1>
        <div className="flex gap-2 flex-wrap">
          {DOC_TYPES.map((d) => (
            <button key={d.key} onClick={() => setDocType(d.key)}
              className={`text-sm px-3 py-1.5 rounded-md ${docType === d.key ? "bg-brand-navy text-white" : "border"}`}>
              {d.label}
            </button>
          ))}
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
        {isDocList && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
            <select value={company} onChange={(e) => setCompany(e.target.value)} className="w-full border rounded-md px-2 py-2 text-sm">
              <option value="">All</option>
              <option value="PSMS">PSMS</option>
              <option value="PPM">PPM</option>
            </select>
          </div>
        )}
        {isDocList && (
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
        )}
        {docType === "activity" && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className="w-full border rounded-md px-2 py-2 text-sm">
                <option value="">All</option>
                {requestTypeOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Island</label>
              <input value={island} onChange={(e) => setIsland(e.target.value)} placeholder="e.g. Naifaru"
                className="w-full border rounded-md px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Brand (Machine Name)</label>
              <select value={machineName} onChange={(e) => setMachineName(e.target.value)} className="w-full border rounded-md px-2 py-2 text-sm">
                <option value="">All</option>
                {machineNameOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={machineCategory} onChange={(e) => setMachineCategory(e.target.value)} className="w-full border rounded-md px-2 py-2 text-sm">
                <option value="">All</option>
                {machineCategoryOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
              </select>
            </div>
          </>
        )}
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

      {isDocList && (
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-gray-500">Records</p>
            <p className="text-lg font-semibold">{rows.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Amount</p>
            <p className="text-lg font-semibold">{currency} {formatMVR(totalAmount)}</p>
          </div>
        </div>
      )}

      {isDocList && (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-3">Ref No.</th>
                <th className="p-3">Engineer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Company</th>
                {docType !== "shipping" && <th className="p-3">Destination</th>}
                <th className="p-3 text-right">Total ({currency})</th>
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
                    <Link href={`/${docType}/${r.id}`} className="text-brand-navy hover:underline">
                      {r.ref_number}
                    </Link>
                  </td>
                  <td className="p-3">{r.engineer_name}</td>
                  <td className="p-3">{new Date(r.request_date || r.summary_date).toLocaleDateString()}</td>
                  <td className="p-3">{r.company}</td>
                  {docType !== "shipping" && <td className="p-3">{r.destination_label}</td>}
                  <td className="p-3 text-right">{formatMVR(r.total_amount)}</td>
                  <td className="p-3">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {docType === "activity" && (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-3">Ref No.</th>
                <th className="p-3">Type</th>
                <th className="p-3">Engineer</th>
                <th className="p-3">Date</th>
                <th className="p-3">From</th>
                <th className="p-3">To</th>
                <th className="p-3">Machine</th>
                <th className="p-3">Category</th>
                <th className="p-3">Facility</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={10} className="p-4 text-center text-gray-400">No activity matches these filters.</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3">
                    <Link href={`/requests/${r.request_id}`} className="text-brand-navy hover:underline">{r.ref_number}</Link>
                  </td>
                  <td className="p-3">{r.request_type || "-"}</td>
                  <td className="p-3">{r.engineer_name}</td>
                  <td className="p-3">{new Date(r.request_date).toLocaleDateString()}</td>
                  <td className="p-3">{r.from_location}</td>
                  <td className="p-3">{r.to_location}</td>
                  <td className="p-3">{r.machine_name ? `${r.machine_name}${r.machine_model ? ` (${r.machine_model})` : ""}` : "-"}</td>
                  <td className="p-3">{r.machine_category || "-"}</td>
                  <td className="p-3">{r.machine_facility || "-"}</td>
                  <td className="p-3">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {docType === "performance" && (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-3">Engineer</th>
                <th className="p-3 text-right">PM</th>
                <th className="p-3 text-right">Installation</th>
                <th className="p-3 text-right">Training</th>
                <th className="p-3 text-right">Advance Total</th>
                <th className="p-3 text-right">Bill Total</th>
                <th className="p-3 text-right">Shipping Total</th>
                <th className="p-3 text-right">Grand Total ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-gray-400">No records match these filters.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.engineerId} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3">{r.engineerName}</td>
                  <td className="p-3 text-right">{r.pmCount}</td>
                  <td className="p-3 text-right">{r.installationCount}</td>
                  <td className="p-3 text-right">{r.trainingCount}</td>
                  <td className="p-3 text-right">{formatMVR(r.advanceTotal)}</td>
                  <td className="p-3 text-right">{formatMVR(r.billTotal)}</td>
                  <td className="p-3 text-right">{formatMVR(r.shippingTotal)}</td>
                  <td className="p-3 text-right font-semibold">{formatMVR(r.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
