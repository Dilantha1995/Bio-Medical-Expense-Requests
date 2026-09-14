import { query } from "./db";

export async function notify(userId, title, message, link) {
  if (!userId) return;
  try {
    await query(
      `INSERT INTO notifications (user_id, title, message, link) VALUES ($1,$2,$3,$4)`,
      [userId, title, message || null, link || null]
    );
  } catch (e) {
    // Never let a broken/missing notifications table break the actual
    // check/approve/submit/etc. action it's attached to.
    console.error("notify() failed (non-fatal):", e.message);
  }
}

export async function notifyMany(userIds, title, message, link) {
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.all(unique.map((id) => notify(id, title, message, link)));
}

/**
 * Returns the ids of everyone who should be notified that a new submission
 * needs checking: any active user whose role grants can_check (built-in
 * approver/admin, or any custom role an admin has granted it to).
 */
export async function getCheckerIds() {
  const { rows } = await query(
    `SELECT u.id FROM users u JOIN roles r ON r.key = u.role WHERE u.active=true AND r.can_check=true`
  );
  return rows.map((r) => r.id);
}

/**
 * Returns the ids of everyone who can give final approval: the per-user
 * can_final_approve override, OR'd with their role's baseline grant
 * (matches the same merge done at login in lib/auth.js).
 */
export async function getFinalApproverIds() {
  const { rows } = await query(
    `SELECT u.id FROM users u JOIN roles r ON r.key = u.role
     WHERE u.active=true AND (u.can_final_approve=true OR r.can_final_approve=true)`
  );
  return rows.map((r) => r.id);
}
