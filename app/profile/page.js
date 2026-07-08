import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const session = await getSession();
  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <ProfileClient />
      </main>
    </div>
  );
}
