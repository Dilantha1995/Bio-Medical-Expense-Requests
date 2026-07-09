import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getBillSummaryById, getAppSettings } from "@/lib/data";
import NavBar from "@/components/NavBar";
import PrintableForm from "@/components/PrintableForm";
import ActionsBar from "../../requests/[id]/ActionsBar";

export default async function BillDetailPage({ params }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const record = await getBillSummaryById(params.id);
  if (!record) notFound();
  if (session.role === "engineer" && record.engineer_id !== session.id) redirect("/dashboard");
  const appSettings = await getAppSettings();

  const doc = {
    ...record,
    docTitle: "Summary of Bills",
    dateValue: record.summary_date,
  };

  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 print:hidden">
          <h1 className="text-lg sm:text-xl font-semibold text-brand-navy break-all">Bill Summary {record.ref_number}</h1>
          <ActionsBar id={record.id} kind="bills" status={record.status} session={session} paymentStatus={record.payment_status} />
        </div>
        <PrintableForm doc={doc} timezone={appSettings.timezone} currency={appSettings.currency} />
      </main>
    </div>
  );
}
