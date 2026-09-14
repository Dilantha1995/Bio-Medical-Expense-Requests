import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import PmRulesClient from "./PmRulesClient";

export default async function PmRulesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div>
      <NavBar session={session} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <PmRulesClient />
      </main>
    </div>
  );
}
