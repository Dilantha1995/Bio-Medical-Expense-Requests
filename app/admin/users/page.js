import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await getSession();
  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-brand-navy mb-4">Manage Users</h1>
        <AdminUsersClient />
      </main>
    </div>
  );
}
