import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import StickerGenerator from "./StickerGenerator";

export default async function StickersPage() {
  const session = await getSession();
  return (
    <div>
      <NavBar fullName={session.fullName} role={session.role} canAccessPmDashboard={session.canAccessPmDashboard} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <StickerGenerator />
      </main>
    </div>
  );
}
