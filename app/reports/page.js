import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div>
      <NavBar session={session} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <ReportsClient session={session} />
      </main>
    </div>
  );
}
