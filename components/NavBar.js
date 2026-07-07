"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NavBar({ fullName, role, canAccessPmDashboard }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/psms-logo.jpg" alt="ProSynergy Medical Systems" width={100} height={36} style={{ objectFit: "contain", height: 32, width: "auto" }} />
          <Image src="/propharma-logo.jpg" alt="Pro Pharma Maldives" width={80} height={36} style={{ objectFit: "contain", height: 32, width: "auto" }} />
        </div>
        <nav className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
          <Link href="/dashboard" className="hover:text-brand-navy">Dashboard</Link>
          <Link href="/requests/new" className="hover:text-brand-navy">New Advance Request</Link>
          <Link href="/bills/new" className="hover:text-brand-navy">New Bill Summary</Link>
          <Link href="/machines" className="hover:text-brand-navy">Machines</Link>
          {(role === "admin" || canAccessPmDashboard) && (
            <Link href="/pm" className="hover:text-brand-navy">PM Schedule</Link>
          )}
          {role === "admin" && <Link href="/admin/users" className="hover:text-brand-navy">Users</Link>}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:inline">{fullName}</span>
          <button onClick={handleLogout} className="text-sm text-brand-red hover:underline">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
