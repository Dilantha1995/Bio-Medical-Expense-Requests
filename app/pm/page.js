import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import PmDashboardClient from "./PmDashboardClient";

export default async function PmDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.canAccessPmDashboard) {
    redirect("/dashboard");
  }
  return (
    <div>
      <NavBar session={session} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <PmDashboardClient session={session} />
      </main>
    </div>
  );
}
