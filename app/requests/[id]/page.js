import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdvanceRequestById, getAppSettings } from "@/lib/data";
import NavBar from "@/components/NavBar";
import PrintableForm from "@/components/PrintableForm";
import ActionsBar from "./ActionsBar";
import BillStatusBanner from "./BillStatusBanner";
import ExtensionHistory from "./ExtensionHistory";

export default async function RequestDetailPage({ params }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const record = await getAdvanceRequestById(params.id);
  if (!record) notFound();
  if (session.role === "engineer" && record.engineer_id !== session.id) redirect("/dashboard");
  const appSettings = await getAppSettings();

  const doc = {
    ...record,
    docTitle: "Travel Advance Request",
    dateValue: record.request_date,
  };

  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 print:hidden">
            <h1 className="text-lg sm:text-xl font-semibold text-brand-navy break-all">Advance Request {record.ref_number}</h1>
            <ActionsBar id={record.id} kind="requests" status={record.status} session={session} returnedAt={record.returned_at} paymentStatus={record.payment_status}
              engineerId={record.engineer_id} taskCompletedAt={record.task_completed_at} isExtensionPending={record.is_extension_pending} expectedEndDate={record.expected_end_date} />
          </div>
          {record.is_extension_pending && (
            <div className="print:hidden border rounded-lg px-4 py-3 mb-4 bg-amber-50 border-amber-200 text-amber-800">
              <span className="font-medium">Extension pending re-approval</span> — this request went back to Submitted so the extended deadline can be checked and approved.
            </div>
          )}
          {record.task_completed_at && (
            <div className="print:hidden border rounded-lg px-4 py-3 mb-4 bg-green-50 border-green-200 text-green-800">
              <span className="font-medium">Task completed</span> — marked done on {new Date(record.task_completed_at).toLocaleDateString()}.
            </div>
          )}
          <BillStatusBanner record={record} />
          <ExtensionHistory history={record.extension_history} />
          <PrintableForm doc={doc} timezone={appSettings.timezone} currency={appSettings.currency} />
        </div>
      </main>
    </div>
  );
}
