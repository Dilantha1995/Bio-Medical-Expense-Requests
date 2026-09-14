import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { query } from "./db";

const COOKIE_NAME = "psms_session";
const alg = "HS256";

// Least-privilege fallback if a user's role key somehow doesn't match any
// row in `roles` (shouldn't happen in normal operation).
const NO_PERMISSIONS = {
  can_check: false,
  can_final_approve: false,
  can_manage_machines: false,
  can_access_pm_dashboard: false,
  can_process_payments: false,
  can_manage_users: false,
  can_manage_config: false,
  can_delete_records: false,
  can_view_all_records: false,
};

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
  let rolePerms = NO_PERMISSIONS;
  try {
    const { rows } = await query(`SELECT * FROM roles WHERE key=$1 AND active=true`, [user.role]);
    if (rows[0]) rolePerms = rows[0];
  } catch (e) {
    // Never let a missing/broken roles table (e.g. before setup has been
    // re-run) break login entirely — fall back to least-privilege.
    console.error("Role lookup failed (falling back to no permissions):", e.message);
  }

  return new SignJWT({
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    initials: user.initials,
    role: user.role,
    mustChangePassword: user.must_change_password,
    // Per-user overrides are OR'd with the role's baseline grant, so an
    // admin role keeps its blanket bypass while individual engineers can
    // still be granted these individually regardless of role.
    canCheck: !!rolePerms.can_check,
    canFinalApprove: !!(user.can_final_approve || rolePerms.can_final_approve),
    canManageMachines: !!(user.can_manage_machines || rolePerms.can_manage_machines),
    canAccessPmDashboard: !!(user.can_access_pm_dashboard || rolePerms.can_access_pm_dashboard),
    canProcessPayments: !!(user.can_process_payments || rolePerms.can_process_payments),
    canManageUsers: !!rolePerms.can_manage_users,
    canManageConfig: !!rolePerms.can_manage_config,
    canDeleteRecords: !!rolePerms.can_delete_records,
    canViewAllRecords: !!rolePerms.can_view_all_records,
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

export async function requireMachineManager() {
  const session = await requireSession();
  if (!session.canManageMachines) {
    const err = new Error("You're not authorized to manage machines.");
    err.status = 403;
    throw err;
  }
  return session;
}

export async function requirePmAccess() {
  const session = await requireSession();
  if (!session.canAccessPmDashboard) {
    const err = new Error("You don't have access to the PM schedule dashboard.");
    err.status = 403;
    throw err;
  }
  return session;
}

export async function requirePaymentProcessor() {
  const session = await requireSession();
  if (!session.canProcessPayments) {
    const err = new Error("You're not authorized to process payments.");
    err.status = 403;
    throw err;
  }
  return session;
}

export async function requireCanManageUsers() {
  const session = await requireSession();
  if (!session.canManageUsers) {
    const err = new Error("You're not authorized to manage users.");
    err.status = 403;
    throw err;
  }
  return session;
}

export async function requireCanManageConfig() {
  const session = await requireSession();
  if (!session.canManageConfig) {
    const err = new Error("You're not authorized to manage this setting.");
    err.status = 403;
    throw err;
  }
  return session;
}

export async function requireCanViewAllRecords() {
  const session = await requireSession();
  if (!session.canViewAllRecords) {
    const err = new Error("You're not authorized to view all records.");
    err.status = 403;
    throw err;
  }
  return session;
}
