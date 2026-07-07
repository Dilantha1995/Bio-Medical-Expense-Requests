import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdvanceRequestById } from "@/lib/data";
import NavBar from "@/components/NavBar";
import PrintableForm from "@/components/PrintableForm";
import ActionsBar from "./ActionsBar";

export default async function RequestDetailPage({ params }) {
  const session = await getSession();
  const record = await getAdvanceRequestById(params.id);
  if (!record) notFound();
  if (session.role === "engineer" && record.engineer_id !== session.id) redirect("/dashboard");

  const doc = {
    ...record,
    docTitle: "Travel Advance Request",
    dateValue: record.request_date,
  };

  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h1 className="text-xl font-semibold text-brand-navy">Advance Request {record.ref_number}</h1>
          <ActionsBar id={record.id} kind="requests" status={record.status} session={session} />
        </div>
        <PrintableForm doc={doc} />
      </main>
    </div>
  );
}
