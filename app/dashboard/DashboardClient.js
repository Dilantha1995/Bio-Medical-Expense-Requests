"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMVR } from "@/lib/calc";

const STATUS_STYLES = {
  submitted: "bg-amber-100 text-amber-800",
  checked: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const BILL_STATUS_STYLES = {
  awaiting_return: "bg-gray-100 text-gray-600",
  pending: "bg-blue-100 text-blue-700",
  overdue: "bg-red-100 text-red-700",
  submitted: "bg-green-100 text-green-700",
};
const BILL_STATUS_LABELS = {
  awaiting_return: "Awaiting return",
  pending: "Bill due",
  overdue: "Bill OVERDUE",
  submitted: "Bill submitted",
};

const PAYMENT_STYLES = {
  processing: "bg-purple-100 text-purple-700",
  processed: "bg-purple-200 text-purple-800",
  rejected: "bg-red-100 text-red-700",
};
const PAYMENT_LABELS = {
  processing: "Payment processing",
  processed: "Payment processed",
  rejected: "Payment rejected",
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function BillStatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BILL_STATUS_STYLES[status] || ""}`}>
      {BILL_STATUS_LABELS[status] || status}
    </span>
  );
}

function PaymentBadge({ status }) {
  if (!status) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STYLES[status] || ""}`}>
      {PAYMENT_LABELS[status] || status}
    </span>
  );
}

function DeletedBadge() {
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Deleted</span>;
}

export default function DashboardClient({ session }) {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [bills, setBills] = useState([]);
  const [shipping, setShipping] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("MVR");

  async function load() {
    setLoading(true);
    const [r1, r2, r3, r4] = await Promise.all([
      fetch("/api/requests").then((r) => r.json()),
      fetch("/api/bills").then((r) => r.json()),
      fetch("/api/config/settings").then((r) => r.json()),
      fetch("/api/shipping").then((r) => r.json()),
    ]);
    setRequests(r1.requests || []);
    setBills(r2.bills || []);
    setCurrency(r3.settings?.currency || "MVR");
    setShipping(r4.shipping || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-brand-navy">
          {session.canViewAllRecords ? "All Travel Forms" : "My Travel Forms"}
        </h1>
        <div className="flex gap-2">
          <Link href="/requests/new" className="flex-1 sm:flex-none text-center text-sm bg-brand-navy text-white px-3 py-2 sm:py-1.5 rounded-md">
            + Advance Request
          </Link>
          <Link href="/bills/new" className="flex-1 sm:flex-none text-center text-sm bg-brand-teal text-white px-3 py-2 sm:py-1.5 rounded-md">
            + Bill Summary
          </Link>
          <Link href="/shipping/new" className="flex-1 sm:flex-none text-center text-sm bg-amber-600 text-white px-3 py-2 sm:py-1.5 rounded-md">
            + Shipping Expense
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">Travel Advance Requests</h2>

            {/* Mobile: cards */}
            <div className="sm:hidden space-y-2">
              {requests.length === 0 && (
                <p className="bg-white rounded-lg shadow-sm p-4 text-center text-gray-400 text-sm">No advance requests yet.</p>
              )}
              {requests.map((r) => (
                <Link key={r.id} href={`/requests/${r.id}`} className={`block bg-white rounded-lg shadow-sm p-3 active:bg-gray-50 ${r.deleted_at ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between mb-1 gap-1 flex-wrap">
                    <span className="text-brand-navy font-medium text-sm">{r.ref_number}</span>
                    <div className="flex gap-1">
                      {r.deleted_at && <DeletedBadge />}
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{r.engineer_name} · {r.destination_label}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{new Date(r.request_date).toLocaleDateString()}</span>
                    <span className="text-sm font-medium">{formatMVR(r.total_amount)} {currency}</span>
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {r.status === "approved" && <BillStatusBadge status={r.bill_status} />}
                    {r.payment_status && <PaymentBadge status={r.payment_status} />}
                  </div>
                </Link>
              ))}
            </div>

            {/* Tablet+: table */}
            <div className="hidden sm:block bg-white rounded-lg shadow-sm overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="p-3">Ref No.</th>
                    <th className="p-3">Engineer</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Destination</th>
                    <th className="p-3 text-right">Total ({currency})</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Bill Summary</th>
                    <th className="p-3">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 && (
                    <tr><td colSpan={8} className="p-4 text-center text-gray-400">No advance requests yet.</td></tr>
                  )}
                  {requests.map((r) => (
                    <tr key={r.id} onClick={() => router.push(`/requests/${r.id}`)}
                      className={`border-b last:border-0 hover:bg-gray-50 cursor-pointer ${r.deleted_at ? "opacity-60" : ""}`}>
                      <td className="p-3">
                        <Link href={`/requests/${r.id}`} onClick={(e) => e.stopPropagation()} className="text-brand-navy hover:underline">{r.ref_number}</Link>
                      </td>
                      <td className="p-3">{r.engineer_name}</td>
                      <td className="p-3">{new Date(r.request_date).toLocaleDateString()}</td>
                      <td className="p-3">{r.destination_label}</td>
                      <td className="p-3 text-right">{formatMVR(r.total_amount)}</td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          {r.deleted_at && <DeletedBadge />}
                          <StatusBadge status={r.status} />
                        </div>
                      </td>
                      <td className="p-3">
                        {r.status === "approved" && <BillStatusBadge status={r.bill_status} />}
                      </td>
                      <td className="p-3"><PaymentBadge status={r.payment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">Bill Summaries</h2>

            {/* Mobile: cards */}
            <div className="sm:hidden space-y-2">
              {bills.length === 0 && (
                <p className="bg-white rounded-lg shadow-sm p-4 text-center text-gray-400 text-sm">No bill summaries yet.</p>
              )}
              {bills.map((b) => (
                <Link key={b.id} href={`/bills/${b.id}`} className={`block bg-white rounded-lg shadow-sm p-3 active:bg-gray-50 ${b.deleted_at ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between mb-1 gap-1 flex-wrap">
                    <span className="text-brand-navy font-medium text-sm">{b.ref_number}</span>
                    <div className="flex gap-1">
                      {b.deleted_at && <DeletedBadge />}
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{b.engineer_name} · {b.destination_label}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{new Date(b.summary_date).toLocaleDateString()}</span>
                    <span className="text-sm font-medium">{formatMVR(b.total_amount)} {currency}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Balance: {formatMVR(b.balance_due)} {currency}</div>
                  {b.payment_status && <div className="mt-2"><PaymentBadge status={b.payment_status} /></div>}
                </Link>
              ))}
            </div>

            {/* Tablet+: table */}
            <div className="hidden sm:block bg-white rounded-lg shadow-sm overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="p-3">Ref No.</th>
                    <th className="p-3">Engineer</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Destination</th>
                    <th className="p-3 text-right">Total ({currency})</th>
                    <th className="p-3 text-right">Balance</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length === 0 && (
                    <tr><td colSpan={8} className="p-4 text-center text-gray-400">No bill summaries yet.</td></tr>
                  )}
                  {bills.map((b) => (
                    <tr key={b.id} onClick={() => router.push(`/bills/${b.id}`)}
                      className={`border-b last:border-0 hover:bg-gray-50 cursor-pointer ${b.deleted_at ? "opacity-60" : ""}`}>
                      <td className="p-3">
                        <Link href={`/bills/${b.id}`} onClick={(e) => e.stopPropagation()} className="text-brand-navy hover:underline">{b.ref_number}</Link>
                      </td>
                      <td className="p-3">{b.engineer_name}</td>
                      <td className="p-3">{new Date(b.summary_date).toLocaleDateString()}</td>
                      <td className="p-3">{b.destination_label}</td>
                      <td className="p-3 text-right">{formatMVR(b.total_amount)}</td>
                      <td className="p-3 text-right">{formatMVR(b.balance_due)}</td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          {b.deleted_at && <DeletedBadge />}
                          <StatusBadge status={b.status} />
                        </div>
                      </td>
                      <td className="p-3"><PaymentBadge status={b.payment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">Shipping Expense Requests</h2>

            {/* Mobile: cards */}
            <div className="sm:hidden space-y-2">
              {shipping.length === 0 && (
                <p className="bg-white rounded-lg shadow-sm p-4 text-center text-gray-400 text-sm">No shipping expense requests yet.</p>
              )}
              {shipping.map((s) => (
                <Link key={s.id} href={`/shipping/${s.id}`} className={`block bg-white rounded-lg shadow-sm p-3 active:bg-gray-50 ${s.deleted_at ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between mb-1 gap-1 flex-wrap">
                    <span className="text-brand-navy font-medium text-sm">{s.ref_number}</span>
                    <div className="flex gap-1">
                      {s.deleted_at && <DeletedBadge />}
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{s.engineer_name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{new Date(s.request_date).toLocaleDateString()}</span>
                    <span className="text-sm font-medium">{formatMVR(s.total_amount)} {currency}</span>
                  </div>
                  {s.payment_status && <div className="mt-2"><PaymentBadge status={s.payment_status} /></div>}
                </Link>
              ))}
            </div>

            {/* Tablet+: table */}
            <div className="hidden sm:block bg-white rounded-lg shadow-sm overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="p-3">Ref No.</th>
                    <th className="p-3">Engineer</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Company</th>
                    <th className="p-3 text-right">Total ({currency})</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {shipping.length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-center text-gray-400">No shipping expense requests yet.</td></tr>
                  )}
                  {shipping.map((s) => (
                    <tr key={s.id} onClick={() => router.push(`/shipping/${s.id}`)}
                      className={`border-b last:border-0 hover:bg-gray-50 cursor-pointer ${s.deleted_at ? "opacity-60" : ""}`}>
                      <td className="p-3">
                        <Link href={`/shipping/${s.id}`} onClick={(e) => e.stopPropagation()} className="text-brand-navy hover:underline">{s.ref_number}</Link>
                      </td>
                      <td className="p-3">{s.engineer_name}</td>
                      <td className="p-3">{new Date(s.request_date).toLocaleDateString()}</td>
                      <td className="p-3">{s.company}</td>
                      <td className="p-3 text-right">{formatMVR(s.total_amount)}</td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          {s.deleted_at && <DeletedBadge />}
                          <StatusBadge status={s.status} />
                        </div>
                      </td>
                      <td className="p-3"><PaymentBadge status={s.payment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
