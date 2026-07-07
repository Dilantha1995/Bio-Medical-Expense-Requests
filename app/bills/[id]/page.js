import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getBillSummaryById } from "@/lib/data";
import NavBar from "@/components/NavBar";
import PrintableForm from "@/components/PrintableForm";
import ActionsBar from "../../requests/[id]/ActionsBar";

export default async function BillDetailPage({ params }) {
  const session = await getSession();
  const record = await getBillSummaryById(params.id);
  if (!record) notFound();
  if (session.role === "engineer" && record.engineer_id !== session.id) redirect("/dashboard");

  const doc = {
    ...record,
    docTitle: "Summary of Bills",
    dateValue: record.summary_date,
  };

  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h1 className="text-xl font-semibold text-brand-navy">Bill Summary {record.ref_number}</h1>
          <ActionsBar id={record.id} kind="bills" status={record.status} session={session} />
        </div>
        <PrintableForm doc={doc} />
      </main>
    </div>
  );
}
