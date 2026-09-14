import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/dashboard", "/requests", "/bills", "/shipping", "/admin", "/machines", "/pm", "/profile", "/configure", "/reports", "/change-password"];
// /admin (Users, Roles) needs canManageUsers; the Configure page and PM
// column/rule editors need canManageConfig — both come from the user's
// role permission bundle (see lib/auth.js's createSessionToken).
const USER_MGMT_PREFIXES = ["/admin"];
const CONFIG_PREFIXES = ["/pm/fields", "/pm/rules", "/configure"];

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

    const needsUserMgmt = USER_MGMT_PREFIXES.some((p) => pathname.startsWith(p));
    if (needsUserMgmt && !payload.canManageUsers) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    const needsConfig = CONFIG_PREFIXES.some((p) => pathname.startsWith(p));
    if (needsConfig && !payload.canManageConfig) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/requests/:path*", "/bills/:path*", "/shipping/:path*", "/admin/:path*", "/machines/:path*", "/pm/:path*", "/profile/:path*", "/configure/:path*", "/reports/:path*", "/change-password/:path*"],
};
