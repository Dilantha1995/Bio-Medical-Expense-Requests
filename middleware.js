import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/dashboard", "/requests", "/bills", "/admin", "/machines", "/pm"];
const ADMIN_ONLY_PREFIXES = ["/admin", "/pm/fields", "/pm/rules"];

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

    const needsAdmin = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
    if (needsAdmin && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/requests/:path*", "/bills/:path*", "/admin/:path*", "/machines/:path*", "/pm/:path*"],
};
