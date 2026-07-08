import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdvanceRequestById, getAppSettings } from "@/lib/data";
import NavBar from "@/components/NavBar";
import PrintableForm from "@/components/PrintableForm";
import ActionsBar from "./ActionsBar";
import BillStatusBanner from "./BillStatusBanner";

export default async function RequestDetailPage({ params }) {
  const session = await getSession();
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
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 print:hidden">
          <h1 className="text-lg sm:text-xl font-semibold text-brand-navy break-all">Advance Request {record.ref_number}</h1>
          <ActionsBar id={record.id} kind="requests" status={record.status} session={session} returnedAt={record.returned_at} />
        </div>
        <BillStatusBanner record={record} />
        <PrintableForm doc={doc} timezone={appSettings.timezone} />
      </main>
    </div>
  );
}
