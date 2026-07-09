import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ChangePasswordClient from "./ChangePasswordClient";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <ChangePasswordClient fullName={session.fullName} />
    </div>
  );
}
