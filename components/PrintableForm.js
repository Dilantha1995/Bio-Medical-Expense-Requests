import Image from "next/image";
import { lineItemTotal, formatMVR } from "@/lib/calc";
import { billItemTotal, summarizeBillItems } from "@/lib/billCalc";
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

export default function PrintableForm({ doc, timezone, currency = "MVR" }) {
  const isBill = doc.docTitle === "Summary of Bills";
  const items = doc.line_items || [];
  const company = COMPANY_INFO[doc.company] || null;
  const summary = isBill ? summarizeBillItems(items) : null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm print:shadow-none print:rounded-none relative" id="printable-form">
      {doc.deleted_at && (
        <div className="bg-red-50 border-2 border-red-300 rounded-md p-3 mb-4 text-sm text-red-800">
          <p className="font-semibold">This entry was deleted</p>
          <p>By {doc.deleted_by_name || "an admin"} on {formatDateTimeInTz(doc.deleted_at, timezone)}</p>
          <p>Reason: {doc.deletion_reason}</p>
        </div>
      )}

      <div className="flex items-center justify-between border-b pb-4 mb-4">
        {company ? (
          <>
            <Image src={company.logo} alt={company.name} width={140} height={50} style={{ objectFit: "contain", height: 44, width: "auto" }} />
            <div className="text-center">
              <p className="font-semibold text-brand-navy">{company.name}</p>
              <p className="text-sm font-medium">{doc.docTitle}</p>
              {doc.destinationLabel && <p className="text-xs text-gray-500">{doc.destinationLabel}</p>}
            </div>
            <div style={{ width: 140 }} />
          </>
        ) : (
          <>
            <Image src="/psms-logo.jpg" alt="ProSynergy Medical Systems" width={140} height={50} style={{ objectFit: "contain", height: 44, width: "auto" }} />
            <div className="text-center">
              <p className="font-semibold text-brand-navy">ProSynergy Maldives Pvt. Ltd.</p>
              <p className="text-sm font-medium">{doc.docTitle}</p>
              {doc.destinationLabel && <p className="text-xs text-gray-500">{doc.destinationLabel}</p>}
            </div>
            <Image src="/propharma-logo.jpg" alt="Pro Pharma Maldives" width={110} height={50} style={{ objectFit: "contain", height: 44, width: "auto" }} />
          </>
        )}
      </div>

      <div className="flex justify-between text-sm mb-4">
        <p><span className="font-medium">Ref No:</span> {doc.ref_number}</p>
        <p><span className="font-medium">Date:</span> {doc.dateValue ? formatDateInTz(doc.dateValue, timezone) : "-"}</p>
      </div>

      {isBill ? (
        <div className="overflow-x-auto mb-4">
          <table className="form-table w-full text-xs border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th>Srn</th>
                <th>Description</th>
                <th>Bill No.</th>
                <th>Nature of Payment</th>
                <th>Supporting Documents</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{it.description}</td>
                  <td>{it.billNo}</td>
                  <td>{it.natureOfPayment}</td>
                  <td>{it.supportingDocs}</td>
                  <td className="text-right">{formatMVR(billItemTotal(it))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold bg-gray-50">
                <td colSpan={5} className="text-right">TOTAL</td>
                <td className="text-right">{formatMVR(doc.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto mb-4">
          <table className="form-table w-full text-xs border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th>#</th>
                <th>From</th>
                <th>To</th>
                <th>Mode</th>
                <th>Days</th>
                <th>Food</th>
                <th>Accom.</th>
                <th>Air fare</th>
                <th>Taxi/Ferry</th>
                <th>Sea Transp.</th>
                <th>Land Transp.</th>
                <th>Others</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{it.fromLocation}<br />{it.fromDate}</td>
                  <td>{it.toLocation}<br />{it.toDate}</td>
                  <td>{it.mode}</td>
                  <td className="text-right">{it.days}</td>
                  <td className="text-right">{formatMVR(it.food)}</td>
                  <td className="text-right">{formatMVR(it.accommodation)}</td>
                  <td className="text-right">{formatMVR(it.airfare)}</td>
                  <td className="text-right">{formatMVR(it.taxiFerry)}</td>
                  <td className="text-right">{formatMVR(it.seaTransport)}</td>
                  <td className="text-right">{formatMVR(it.landTransport)}</td>
                  <td className="text-right">{formatMVR(it.others)}</td>
                  <td className="text-right font-medium">{formatMVR(lineItemTotal(it))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold bg-gray-50">
                <td colSpan={12} className="text-right">TOTAL</td>
                <td className="text-right">{formatMVR(doc.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {isBill && summary && items.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 mb-4 text-xs">
          <div className="border rounded-md p-2">
            <p className="font-medium mb-1">By Supporting Documents</p>
            {Object.entries(summary.bySupportingDocs).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k} ({v.count})</span>
                <span>{formatMVR(v.total)}</span>
              </div>
            ))}
          </div>
          <div className="border rounded-md p-2">
            <p className="font-medium mb-1">By Nature of Payment</p>
            {Object.entries(summary.byNature).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k} ({v.count})</span>
                <span>{formatMVR(v.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(doc.advance_received !== undefined) && (
        <div className="flex justify-end gap-8 text-sm mb-4">
          <p><span className="font-medium">Advance Received:</span> {currency} {formatMVR(doc.advance_received)}</p>
          <p><span className="font-medium">Balance:</span> {currency} {formatMVR(doc.balance_due)}
            {" "}{Number(doc.balance_due) > 0 ? "(due from engineer)" : Number(doc.balance_due) < 0 ? "(due to engineer)" : ""}
          </p>
        </div>
      )}

      {doc.advance_ref_number && (
        <p className="text-sm mb-4"><span className="font-medium">Related Advance Request:</span> {doc.advance_ref_number}</p>
      )}

      <div className="grid sm:grid-cols-2 gap-4 text-sm mb-4">
        <p><span className="font-medium">Purpose of Travel:</span> {doc.purpose_of_travel || "-"}</p>
        <p><span className="font-medium">Notes:</span> {doc.notes || "-"}</p>
      </div>

      {doc.payment_status && (
        <div className={`border rounded-md p-3 mb-4 text-sm ${doc.payment_status === "rejected" ? "bg-red-50 border-red-200" : "bg-purple-50 border-purple-200"}`}>
          <p className={`font-medium mb-1 ${doc.payment_status === "rejected" ? "text-red-800" : "text-purple-800"}`}>
            Payment {doc.payment_status === "processed" ? "Processed" : doc.payment_status === "rejected" ? "Rejected" : "Processing"}
          </p>
          {doc.payment_status === "processed" && (
            <>
              <p className="text-purple-700">By {doc.payment_processed_by_name} on {formatDateTimeInTz(doc.payment_processed_at, timezone)}</p>
              {doc.payment_slip_data && (
                <div className="mt-2">
                  <p className="text-xs text-purple-600 mb-1">Payment slip:</p>
                  <img src={doc.payment_slip_data} alt="Payment slip" className="max-h-48 border rounded" />
                </div>
              )}
            </>
          )}
          {doc.payment_status === "rejected" && (
            <p className="text-red-700">Reason: {doc.payment_rejection_reason}</p>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 text-sm mt-8 pt-4 border-t">
        <SignatureBlock label="Prepared By" name={`${doc.engineer_name} (${doc.engineer_initials})`}
          signature={doc.prepared_by_signature} timestamp={doc.prepared_at} timezone={timezone} />
        <SignatureBlock label="Checked By" name={doc.checked_by_name}
          signature={doc.checked_by_signature} timestamp={doc.checked_at} timezone={timezone} />
        <SignatureBlock label="Approved By" name={doc.approved_by_name}
          signature={doc.approved_by_signature} timestamp={doc.approved_at} timezone={timezone} />
      </div>

      {doc.status === "rejected" && (
        <p className="mt-4 text-sm text-red-600"><span className="font-medium">Rejected:</span> {doc.rejection_reason}</p>
      )}
    </div>
  );
}
