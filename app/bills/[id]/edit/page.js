import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getBillSummaryById } from "@/lib/data";
import NavBar from "@/components/NavBar";
import NewBillForm from "../../new/NewBillForm";

export default async function EditBillPage({ params }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const record = await getBillSummaryById(params.id);
  if (!record) notFound();

  const isAdmin = session.role === "admin";
  const isOwnerDraft = record.status === "draft" && Number(record.engineer_id) === Number(session.id);
  if (!isAdmin && !isOwnerDraft) redirect(`/bills/${record.id}`);

  return (
    <div>
      <NavBar session={session} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-semibold text-brand-navy mb-2">
          Edit Bill Summary {record.ref_number}
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          {record.status === "draft"
            ? "Save your progress any time. This draft will not be sent for checking until you select Final Submission."
            : "Admin edit mode: changes are saved to the existing record. The approval status and audit fields are preserved."}
        </p>
        <NewBillForm billId={record.id} initialBill={record} />
      </main>
    </div>
  );
}
