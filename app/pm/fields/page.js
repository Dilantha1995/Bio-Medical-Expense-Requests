import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import PmFieldsClient from "./PmFieldsClient";

export default async function PmFieldsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <PmFieldsClient />
      </main>
    </div>
  );
}
