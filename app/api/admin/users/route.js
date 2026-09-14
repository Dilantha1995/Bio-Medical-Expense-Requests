import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireCanManageUsers, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    await requireCanManageUsers();
    const { rows } = await query(
      `SELECT id, username, full_name, initials, designation, role, can_final_approve, can_manage_machines, can_access_pm_dashboard, can_process_payments, must_change_password, active, created_at
       FROM users ORDER BY created_at DESC`
    );
    return NextResponse.json({ users: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    await requireCanManageUsers();
    const body = await req.json();
    const { username, password, fullName, initials, designation, role, canFinalApprove, canManageMachines, canAccessPmDashboard, canProcessPayments } = body;

    if (!username || !password || !fullName || !initials || !role) {
      return NextResponse.json({ error: "Username, password, full name, initials, and role are required." }, { status: 400 });
    }
    const roleCheck = await query(`SELECT 1 FROM roles WHERE key=$1 AND active=true`, [role]);
    if (roleCheck.rows.length === 0) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const hash = await hashPassword(password);
    const { rows } = await query(
      `INSERT INTO users (username, password_hash, full_name, initials, designation, role, can_final_approve, can_manage_machines, can_access_pm_dashboard, can_process_payments, must_change_password, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,true)
       RETURNING id, username, full_name, initials, designation, role, can_final_approve, can_manage_machines, can_access_pm_dashboard, can_process_payments, active`,
      [username.trim().toLowerCase(), hash, fullName, initials.trim().toUpperCase(), designation || null, role, !!canFinalApprove, !!canManageMachines, !!canAccessPmDashboard, !!canProcessPayments]
    );
    return NextResponse.json({ user: rows[0] });
  } catch (e) {
    if (e.code === "23505") {
      return NextResponse.json({ error: "That username already exists." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to create user." }, { status: e.status || 500 });
  }
}
