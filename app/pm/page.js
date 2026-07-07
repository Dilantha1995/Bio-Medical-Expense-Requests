import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import PmDashboardClient from "./PmDashboardClient";

export default async function PmDashboardPage() {
  const session = await getSession();
  if (session.role !== "admin" && !session.canAccessPmDashboard) {
    redirect("/dashboard");
  }
  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <PmDashboardClient session={session} />
      </main>
    </div>
  );
}
