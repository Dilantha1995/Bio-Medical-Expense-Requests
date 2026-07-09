import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import MachinesClient from "./MachinesClient";

export default async function MachinesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <MachinesClient session={session} />
      </main>
    </div>
  );
}
