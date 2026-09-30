"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateInTz, formatDateTimeInTz } from "@/lib/formatDate";

const COMPANY_INFO = {
  PSMS: { name: "ProSynergy Maldives Pvt. Ltd.", logo: "/psms-logo.jpg" },
  PPM: { name: "Pro Pharma Maldives Pvt. Ltd.", logo: "/propharma-logo.jpg" },
};

function SignatureBlock({ label, name, signature, timestamp, timezone }) {
  return (
    <div>
      <p className="font-medium mb-1">{label}</p>
      {signature ? (
        <img src={signature} alt={`${name} signature`} className="h-12 object-contain mb-1" />
      ) : (
        <div className="h-12 mb-1" />
      )}
      <p>{name || "Pending"}</p>
      <p className="text-gray-500">{timestamp ? formatDateTimeInTz(timestamp, timezone) : "-"}</p>
    </div>
  );
}

export default function TransferView({ initial, timezone }) {
  const [transfer, setTransfer] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const company = COMPANY_INFO[transfer.company] || COMPANY_INFO.PSMS;

  async function confirmReceipt() {
    setConfirming(true);
    setError("");
    const res = await fetch(`/api/machines/transfers/${transfer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm_receipt" }),
    });
    const data = await res.json();
    setConfirming(false);
    if (!res.ok) { setError(data.error || "Failed to confirm receipt."); return; }
    setTransfer(data.transfer);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <h1 className="text-lg sm:text-xl font-semibold text-brand-navy">Machine Transfer {transfer.ref_number}</h1>
        <div className="flex gap-2">
          <Link href="/machines" className="text-sm border px-3 py-1.5 rounded-md">Back to Machines</Link>
          <a href={`/api/machines/transfers/${transfer.id}/pdf`} target="_blank" rel="noreferrer"
            className="text-sm border border-brand-navy text-brand-navy px-3 py-1.5 rounded-md">
            Download PDF
          </a>
          {transfer.status !== "received" && (
            <button onClick={confirmReceipt} disabled={confirming}
              className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded-md disabled:opacity-50">
              {confirming ? "Confirming..." : "Confirm Receipt"}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 print:hidden">{error}</p>}

      <div className="bg-white p-6 rounded-lg shadow-sm print:shadow-none">
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <img src={company.logo} alt={company.name} style={{ objectFit: "contain", height: 44 }} />
          <div className="text-center">
            <p className="font-semibold text-brand-navy">{company.name}</p>
            <p className="text-sm font-medium">Machine Transfer Note</p>
          </div>
          <div style={{ width: 140 }} />
        </div>

        <div className="flex justify-between text-sm mb-4 flex-wrap gap-2">
          <p><span className="font-medium">Ref No:</span> {transfer.ref_number}</p>
          <p><span className="font-medium">Transfer Date:</span> {formatDateInTz(transfer.transfer_date, timezone)}</p>
        </div>

        <div className="text-sm mb-4">
          <p><span className="font-medium">Machine:</span> {transfer.machine_name}{transfer.machine_model ? ` (${transfer.machine_model})` : ""}</p>
          <p><span className="font-medium">Serial Number:</span> {transfer.machine_serial_number}</p>
        </div>

        <div className="flex items-center justify-between gap-4 border rounded-md p-4 mb-4">
          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase">From</p>
            <p className="font-semibold">{transfer.from_facility_name || "-"}</p>
            {transfer.from_location_label && <p className="text-xs text-gray-500">{transfer.from_location_label}</p>}
          </div>
          <div className="text-xl text-brand-navy">&rarr;</div>
          <div className="flex-1 text-right">
            <p className="text-xs text-gray-400 uppercase">To</p>
            <p className="font-semibold">{transfer.to_facility_name}</p>
            {transfer.to_location_label && <p className="text-xs text-gray-500">{transfer.to_location_label}</p>}
          </div>
        </div>

        {transfer.reason && (
          <p className="text-sm mb-4"><span className="font-medium">Reason:</span> {transfer.reason}</p>
        )}

        <div className={`border rounded-md p-3 mb-4 text-sm ${transfer.status === "received" ? "bg-green-50 border-green-200 text-green-800" : "bg-purple-50 border-purple-200 text-purple-800"}`}>
          {transfer.status === "received" ? "Receipt confirmed" : "In transit — awaiting receipt confirmation"}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm mt-8 pt-4 border-t">
          <SignatureBlock label="Transferred By" name={transfer.transferred_by_name}
            signature={transfer.transferred_by_signature} timestamp={transfer.transferred_at} timezone={timezone} />
          <SignatureBlock label="Received By" name={transfer.received_by_name}
            signature={transfer.received_by_signature} timestamp={transfer.received_at} timezone={timezone} />
        </div>
      </div>
    </div>
  );
}
