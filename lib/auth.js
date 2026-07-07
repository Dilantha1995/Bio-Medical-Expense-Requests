import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const COOKIE_NAME = "psms_session";
const alg = "HS256";

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set. Add it to your environment variables.");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(user) {
  return new SignJWT({
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    initials: user.initials,
    role: user.role,
    canFinalApprove: user.can_final_approve,
    canManageMachines: user.can_manage_machines,
    canAccessPmDashboard: user.can_access_pm_dashboard,
  })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function setSessionCookie(token) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    const err = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
  return session;
}

export async function requireRole(...roles) {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    const err = new Error("FORBIDDEN");
    err.status = 403;
    throw err;
  }
  return session;
}

export async function requireMachineManager() {
  const session = await requireSession();
  if (session.role !== "admin" && !session.canManageMachines) {
    const err = new Error("You're not authorized to manage machines.");
    err.status = 403;
    throw err;
  }
  return session;
}

export async function requirePmAccess() {
  const session = await requireSession();
  if (session.role !== "admin" && !session.canAccessPmDashboard) {
    const err = new Error("You don't have access to the PM schedule dashboard.");
    err.status = 403;
    throw err;
  }
  return session;
}
