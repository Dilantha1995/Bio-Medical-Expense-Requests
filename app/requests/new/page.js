import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import NewRequestForm from "./NewRequestForm";

export default async function NewRequestPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div>
      <NavBar session={session} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-semibold text-brand-navy mb-4">New Travel Advance Request</h1>
        <NewRequestForm />
      </main>
    </div>
  );
}
