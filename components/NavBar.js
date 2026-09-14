"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";

function NavLink({ href, label, pathname }) {
  return (
    <Link href={href} className={`hover:text-brand-navy ${pathname === href ? "text-brand-navy font-medium" : ""}`}>
      {label}
    </Link>
  );
}

function NavDropdown({ label, items, pathname }) {
  const [open, setOpen] = useState(false);
  const active = items.some((i) => i.href === pathname);
  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        className={`flex items-center gap-1 hover:text-brand-navy ${active ? "text-brand-navy font-medium" : ""}`}
      >
        {label} <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border rounded-md shadow-lg py-1 min-w-[190px] z-30">
          {items.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 text-sm hover:bg-gray-50 ${pathname === l.href ? "text-brand-navy font-medium" : "text-gray-700"}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NavBar({ session }) {
  const { fullName, canManageUsers, canManageRoles, canManageConfig, canAccessPmDashboard, canViewReports } = session;
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [schemaWarning, setSchemaWarning] = useState(null);

  useEffect(() => {
    if (!canManageConfig) return;
    fetch("/api/schema-check")
      .then((r) => r.json())
      .then((d) => { if (!d.ok) setSchemaWarning(d.missing || []); })
      .catch(() => {});
  }, [canManageConfig]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const newLinks = [
    { href: "/requests/new", label: "New Advance Request" },
    { href: "/bills/new", label: "New Bill Summary" },
    { href: "/shipping/new", label: "New Shipping Expense" },
  ];
  const adminLinks = [
    ...(canManageUsers ? [{ href: "/admin/users", label: "Users" }] : []),
    ...(canManageRoles ? [{ href: "/admin/roles", label: "Roles" }] : []),
    ...(canManageConfig ? [{ href: "/configure", label: "Configure" }] : []),
  ];
  const showPm = canAccessPmDashboard;
  const showReports = canViewReports;

  // Mobile keeps a single flat, scrollable list rather than dropdowns.
  const mobileLinks = [
    { href: "/dashboard", label: "Dashboard" },
    ...newLinks,
    { href: "/machines", label: "Machines" },
    ...(showPm ? [{ href: "/pm", label: "PM Schedule" }] : []),
    ...(showReports ? [{ href: "/reports", label: "Reports" }] : []),
    ...adminLinks,
    { href: "/profile", label: "My Profile" },
  ];

  return (
    <header className="bg-white border-b sticky top-0 z-20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Image src="/psms-logo.jpg" alt="ProSynergy Medical Systems" width={100} height={36} style={{ objectFit: "contain", height: 28, width: "auto" }} />
          <Image src="/propharma-logo.jpg" alt="Pro Pharma Maldives" width={80} height={36} style={{ objectFit: "contain", height: 28, width: "auto" }} className="hidden xs:block" />
        </div>

        <nav className="hidden md:flex items-center gap-5 text-sm text-gray-600">
          <NavLink href="/dashboard" label="Dashboard" pathname={pathname} />
          <NavDropdown label="New" items={newLinks} pathname={pathname} />
          <NavLink href="/machines" label="Machines" pathname={pathname} />
          {showPm && <NavLink href="/pm" label="PM Schedule" pathname={pathname} />}
          {showReports && <NavLink href="/reports" label="Reports" pathname={pathname} />}
          {adminLinks.length > 0 && <NavDropdown label="Admin" items={adminLinks} pathname={pathname} />}
          <NavLink href="/profile" label="My Profile" pathname={pathname} />
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell />
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
            {mobileLinks.map((l) => (
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

      {schemaWarning && (
        <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-xs text-amber-800">
          <span className="font-medium">Database needs an update</span> — some recent features aren't available yet
          ({schemaWarning.join(", ")}). Visit your setup URL again:{" "}
          <code className="bg-amber-100 px-1 rounded">yoursite.vercel.app/api/setup?token=YOUR_SETUP_SECRET</code>{" "}
          to fix this — it's safe to run anytime and won't touch existing data.
        </div>
      )}
    </header>
  );
}
