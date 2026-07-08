import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import ConfigureClient from "./ConfigureClient";

export default async function ConfigurePage() {
  const session = await getSession();
  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <ConfigureClient />
      </main>
    </div>
  );
}
