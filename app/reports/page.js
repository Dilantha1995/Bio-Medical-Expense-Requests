import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const session = await getSession();
  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <ReportsClient session={session} />
      </main>
    </div>
  );
}
