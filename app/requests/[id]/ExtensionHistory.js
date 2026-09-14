const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function ExtensionHistory({ history }) {
  if (!Array.isArray(history) || history.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-4 print:hidden">
      <h2 className="text-sm font-semibold text-gray-600 mb-2">Extension History</h2>
      <div className="space-y-2">
        {history.map((h, i) => (
          <div key={i} className="border rounded-md p-2 text-sm flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-medium">{h.previousEndDate ? new Date(h.previousEndDate).toLocaleDateString() : "-"}</span>
              {" → "}
              <span className="font-medium">{new Date(h.newEndDate).toLocaleDateString()}</span>
              <span className="text-gray-500"> — requested by {h.requestedByName} on {new Date(h.requestedAt).toLocaleDateString()}</span>
              {h.reason && <div className="text-gray-500 text-xs mt-0.5">Reason: {h.reason}</div>}
              {h.status === "rejected" && h.rejectionReason && (
                <div className="text-red-600 text-xs mt-0.5">Declined: {h.rejectionReason}</div>
              )}
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLES[h.status] || "bg-gray-100 text-gray-700"}`}>
              {h.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
