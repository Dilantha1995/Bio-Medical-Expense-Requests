import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getShippingRequestById, getAppSettings } from "@/lib/data";
import NavBar from "@/components/NavBar";
import PrintableForm from "@/components/PrintableForm";
import ActionsBar from "../../requests/[id]/ActionsBar";

export default async function ShippingDetailPage({ params }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const record = await getShippingRequestById(params.id);
  if (!record) notFound();
  if (!session.canViewAllRecords && record.engineer_id !== session.id) redirect("/dashboard");
  const appSettings = await getAppSettings();

  const doc = {
    ...record,
    docTitle: "Shipping Expense Request",
    dateValue: record.request_date,
  };

  return (
    <div>
      <NavBar session={session} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 print:hidden">
          <h1 className="text-lg sm:text-xl font-semibold text-brand-navy break-all">Shipping Expense Request {record.ref_number}</h1>
          <ActionsBar id={record.id} kind="shipping" status={record.status} session={session} paymentStatus={record.payment_status} engineerId={record.engineer_id} />
        </div>
        <div className="max-w-4xl mx-auto">
          <PrintableForm doc={doc} timezone={appSettings.timezone} currency={appSettings.currency} />
        </div>
      </main>
    </div>
  );
}
