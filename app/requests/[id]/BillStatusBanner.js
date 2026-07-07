import Link from "next/link";

const STYLES = {
  awaiting_return: { bg: "bg-gray-50 border-gray-200", text: "text-gray-600", label: "Awaiting return to office" },
  pending: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Bill summary due" },
  overdue: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Bill summary OVERDUE" },
  submitted: { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Bill summary submitted" },
};

export default function BillStatusBanner({ record }) {
  if (record.status !== "approved") return null;
  const style = STYLES[record.bill_status] || STYLES.awaiting_return;

  return (
    <div className={`print:hidden border rounded-lg px-4 py-3 mb-4 flex items-center justify-between ${style.bg}`}>
      <div>
        <span className={`font-medium ${style.text}`}>{style.label}</span>
        {record.returned_at && (
          <span className="text-sm text-gray-500 ml-2">
            — returned {new Date(record.returned_at).toLocaleDateString()}
            {record.bill_status !== "submitted" && " · bill due within 3 working days of return"}
          </span>
        )}
      </div>
      {record.bill_status === "pending" || record.bill_status === "overdue" ? (
        <Link href={`/bills/new?advanceRequestId=${record.id}`} className="text-sm text-brand-navy hover:underline whitespace-nowrap">
          Submit Bill Summary →
        </Link>
      ) : null}
    </div>
  );
}
