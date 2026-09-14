import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/dashboard", "/requests", "/bills", "/shipping", "/admin", "/machines", "/pm", "/profile", "/configure", "/reports", "/change-password"];
// Each area checks its own claim from the user's role permission bundle
// (see lib/auth.js's createSessionToken) rather than one blanket "admin"
// check — checked most-specific-prefix-first so /admin/users and
// /admin/roles don't fall through to a shared /admin rule.
const PREFIX_CHECKS = [
  { prefix: "/admin/users", claim: "canManageUsers" },
  { prefix: "/admin/roles", claim: "canManageRoles" },
  { prefix: "/pm/fields", claim: "canManagePmColumns" },
  { prefix: "/pm/rules", claim: "canManagePmRules" },
  { prefix: "/configure", claim: "canManageConfig" },
  { prefix: "/reports", claim: "canViewReports" },
];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get("psms_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.mustChangePassword && pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }

    for (const { prefix, claim } of PREFIX_CHECKS) {
      if (pathname.startsWith(prefix) && !payload[claim]) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/requests/:path*", "/bills/:path*", "/shipping/:path*", "/admin/:path*", "/machines/:path*", "/pm/:path*", "/profile/:path*", "/configure/:path*", "/reports/:path*", "/change-password/:path*"],
};
