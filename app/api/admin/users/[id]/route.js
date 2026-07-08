import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole, hashPassword } from "@/lib/auth";

export async function PATCH(req, { params }) {
  try {
    await requireRole("admin");
    const body = await req.json();
    const { active, role, canFinalApprove, canManageMachines, canAccessPmDashboard, canProcessPayments, newPassword, designation, fullName } = body;

    const sets = [];
    const values = [];
    let i = 1;

    if (typeof active === "boolean") { sets.push(`active=$${i++}`); values.push(active); }
    if (role) { sets.push(`role=$${i++}`); values.push(role); }
    if (typeof canFinalApprove === "boolean") { sets.push(`can_final_approve=$${i++}`); values.push(canFinalApprove); }
    if (typeof canManageMachines === "boolean") { sets.push(`can_manage_machines=$${i++}`); values.push(canManageMachines); }
    if (typeof canAccessPmDashboard === "boolean") { sets.push(`can_access_pm_dashboard=$${i++}`); values.push(canAccessPmDashboard); }
    if (typeof canProcessPayments === "boolean") { sets.push(`can_process_payments=$${i++}`); values.push(canProcessPayments); }
    if (designation !== undefined) { sets.push(`designation=$${i++}`); values.push(designation); }
    if (fullName) { sets.push(`full_name=$${i++}`); values.push(fullName); }
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
      }
      sets.push(`password_hash=$${i++}`);
      values.push(await hashPassword(newPassword));
      sets.push(`must_change_password=$${i++}`);
      values.push(true);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    values.push(params.id);
    const { rows } = await query(
      `UPDATE users SET ${sets.join(", ")} WHERE id=$${i}
       RETURNING id, username, full_name, initials, designation, role, can_final_approve, can_manage_machines, can_access_pm_dashboard, can_process_payments, must_change_password, active`,
      values
    );

    if (rows.length === 0) return NextResponse.json({ error: "User not found." }, { status: 404 });
    return NextResponse.json({ user: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to update user." }, { status: e.status || 500 });
  }
}
