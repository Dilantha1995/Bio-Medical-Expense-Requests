import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import NewBillForm from "./NewBillForm";

export default async function NewBillPage() {
  const session = await getSession();
  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-brand-navy mb-4">New Bill Summary</h1>
        <NewBillForm />
      </main>
    </div>
  );
}
