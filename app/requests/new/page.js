import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import NewRequestForm from "./NewRequestForm";

export default async function NewRequestPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-brand-navy mb-4">New Travel Advance Request</h1>
        <NewRequestForm />
      </main>
    </div>
  );
}
