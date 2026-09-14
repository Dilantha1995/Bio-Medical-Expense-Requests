import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div>
      <NavBar session={session} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-semibold text-brand-navy mb-4">Manage Users</h1>
        <AdminUsersClient />
      </main>
    </div>
  );
}
