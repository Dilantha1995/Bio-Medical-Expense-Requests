import Image from "next/image";
import { lineItemTotal, formatMVR } from "@/lib/calc";

export default function PrintableForm({ doc }) {
  const items = doc.line_items || [];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm print:shadow-none print:rounded-none" id="printable-form">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <Image src="/psms-logo.jpg" alt="ProSynergy Medical Systems" width={140} height={50} style={{ objectFit: "contain", height: 44, width: "auto" }} />
        <div className="text-center">
          <p className="font-semibold text-brand-navy">ProSynergy Maldives Pvt. Ltd.</p>
          <p className="text-sm font-medium">{doc.docTitle}</p>
          {doc.destinationLabel && <p className="text-xs text-gray-500">{doc.destinationLabel}</p>}
        </div>
        <Image src="/propharma-logo.jpg" alt="Pro Pharma Maldives" width={110} height={50} style={{ objectFit: "contain", height: 44, width: "auto" }} />
      </div>

      <div className="flex justify-between text-sm mb-4">
        <p><span className="font-medium">Ref No:</span> {doc.ref_number}</p>
        <p><span className="font-medium">Date:</span> {doc.dateValue ? new Date(doc.dateValue).toLocaleDateString() : "-"}</p>
      </div>

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

      {(doc.advance_received !== undefined) && (
        <div className="flex justify-end gap-8 text-sm mb-4">
          <p><span className="font-medium">Advance Received:</span> MVR {formatMVR(doc.advance_received)}</p>
          <p><span className="font-medium">Balance:</span> MVR {formatMVR(doc.balance_due)}
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

      <div className="grid sm:grid-cols-3 gap-4 text-sm mt-8 pt-4 border-t">
        <div>
          <p className="font-medium mb-1">Prepared By</p>
          <p>{doc.engineer_name} ({doc.engineer_initials})</p>
          <p className="text-gray-500">{doc.prepared_at ? new Date(doc.prepared_at).toLocaleString() : "-"}</p>
        </div>
        <div>
          <p className="font-medium mb-1">Checked By</p>
          <p>{doc.checked_by_name || "Pending"}</p>
          <p className="text-gray-500">{doc.checked_at ? new Date(doc.checked_at).toLocaleString() : "-"}</p>
        </div>
        <div>
          <p className="font-medium mb-1">Approved By</p>
          <p>{doc.approved_by_name || "Pending"}</p>
          <p className="text-gray-500">{doc.approved_at ? new Date(doc.approved_at).toLocaleString() : "-"}</p>
        </div>
      </div>

      {doc.status === "rejected" && (
        <p className="mt-4 text-sm text-red-600"><span className="font-medium">Rejected:</span> {doc.rejection_reason}</p>
      )}
    </div>
  );
}
