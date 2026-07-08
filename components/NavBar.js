"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function NavBar({ fullName, role, canAccessPmDashboard }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/requests/new", label: "New Advance Request" },
    { href: "/bills/new", label: "New Bill Summary" },
    { href: "/machines", label: "Machines" },
    ...(role === "admin" || canAccessPmDashboard ? [{ href: "/pm", label: "PM Schedule" }] : []),
    ...(role === "admin" || role === "approver" ? [{ href: "/reports", label: "Reports" }] : []),
    ...(role === "admin" ? [{ href: "/admin/users", label: "Users" }] : []),
    ...(role === "admin" ? [{ href: "/configure", label: "Configure" }] : []),
    { href: "/profile", label: "My Profile" },
  ];

  return (
    <header className="bg-white border-b sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Image src="/psms-logo.jpg" alt="ProSynergy Medical Systems" width={100} height={36} style={{ objectFit: "contain", height: 28, width: "auto" }} />
          <Image src="/propharma-logo.jpg" alt="Pro Pharma Maldives" width={80} height={36} style={{ objectFit: "contain", height: 28, width: "auto" }} className="hidden xs:block" />
        </div>

        <nav className="hidden md:flex items-center gap-4 text-sm text-gray-600">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`hover:text-brand-navy ${pathname === l.href ? "text-brand-navy font-medium" : ""}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden md:inline">{fullName}</span>
          <button onClick={handleLogout} className="hidden md:inline text-sm text-brand-red hover:underline">
            Log out
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 -mr-2 text-gray-600"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t bg-white">
          <nav className="flex flex-col py-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 text-sm border-b last:border-0 ${pathname === l.href ? "text-brand-navy font-medium bg-gray-50" : "text-gray-700"}`}
              >
                {l.label}
              </Link>
            ))}
            <div className="px-4 py-3 flex items-center justify-between border-t bg-gray-50">
              <span className="text-sm text-gray-500">{fullName}</span>
              <button onClick={handleLogout} className="text-sm text-brand-red font-medium">
                Log out
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
