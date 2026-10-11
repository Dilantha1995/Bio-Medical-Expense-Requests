import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getBillSummaryById, getAppSettings, withSignatureSetting } from "@/lib/data";
import NavBar from "@/components/NavBar";
import PrintableForm from "@/components/PrintableForm";
import ActionsBar from "../../requests/[id]/ActionsBar";

export default async function BillDetailPage({ params }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const record = await getBillSummaryById(params.id);
  if (!record) notFound();
  if (!session.canViewAllRecords && record.engineer_id !== session.id) redirect("/dashboard");
  const appSettings = await getAppSettings();

  const doc = {
    ...withSignatureSetting(record, appSettings),
    docTitle: "Summary of Bills",
    dateValue: record.summary_date,
  };

  return (
    <div>
      <NavBar session={session} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <div className="mx-auto print:max-w-none">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold text-brand-navy break-all">Bill Summary {record.ref_number}</h1>
              {record.status === "draft" && (
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 border border-amber-200 rounded px-2 py-1">
                  Draft — Not Submitted
                </span>
              )}
            </div>
            <ActionsBar id={record.id} kind="bills" status={record.status} session={session} paymentStatus={record.payment_status} engineerId={record.engineer_id} />
          </div>
          <PrintableForm doc={doc} timezone={appSettings.timezone} currency={appSettings.currency} />
        </div>
      </main>
    </div>
  );
}
