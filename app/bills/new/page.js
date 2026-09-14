import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import NewBillForm from "./NewBillForm";

export default async function NewBillPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div>
      <NavBar session={session} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-semibold text-brand-navy mb-4">New Bill Summary</h1>
        <Suspense fallback={<p className="text-sm text-gray-400">Loading...</p>}>
          <NewBillForm />
        </Suspense>
      </main>
    </div>
  );
}
