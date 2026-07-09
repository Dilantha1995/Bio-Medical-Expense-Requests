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
 * needs checking: all active approvers and admins.
 */
export async function getCheckerIds() {
  const { rows } = await query(`SELECT id FROM users WHERE role IN ('approver','admin') AND active=true`);
  return rows.map((r) => r.id);
}

/**
 * Returns the ids of everyone who can give final approval: active approvers
 * flagged can_final_approve, plus admins.
 */
export async function getFinalApproverIds() {
  const { rows } = await query(
    `SELECT id FROM users WHERE active=true AND (role='admin' OR (role='approver' AND can_final_approve=true))`
  );
  return rows.map((r) => r.id);
}
