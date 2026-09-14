import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession, requireCanManageRoles } from "@/lib/auth";

const PERMISSION_FIELDS = [
  "canCheck", "canFinalApprove", "canManageMachines", "canAccessPmDashboard",
  "canProcessPayments", "canManageUsers", "canManageRoles", "canManageConfig", "canDeleteRecords", "canViewAllRecords",
  "canManagePmColumns", "canManagePmRules", "canViewReports", "canViewActivityLog", "canViewEngineerPerformance",
];
const COLUMN_BY_FIELD = {
  canCheck: "can_check",
  canFinalApprove: "can_final_approve",
  canManageMachines: "can_manage_machines",
  canAccessPmDashboard: "can_access_pm_dashboard",
  canProcessPayments: "can_process_payments",
  canManageUsers: "can_manage_users",
  canManageRoles: "can_manage_roles",
  canManageConfig: "can_manage_config",
  canDeleteRecords: "can_delete_records",
  canViewAllRecords: "can_view_all_records",
  canManagePmColumns: "can_manage_pm_columns",
  canManagePmRules: "can_manage_pm_rules",
  canViewReports: "can_view_reports",
  canViewActivityLog: "can_view_activity_log",
  canViewEngineerPerformance: "can_view_engineer_performance",
};

function slugify(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

export async function GET() {
  try {
    const session = await requireSession();
    if (!session.canManageUsers && !session.canManageRoles) {
      return NextResponse.json({ error: "You're not authorized to view roles." }, { status: 403 });
    }
    const { rows } = await query(`SELECT * FROM roles WHERE active=true ORDER BY sort_order ASC, id ASC`);
    return NextResponse.json({ roles: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req) {
  try {
    await requireCanManageRoles();
    const body = await req.json();
    const { label } = body;
    if (!label || !label.trim()) {
      return NextResponse.json({ error: "A role name is required." }, { status: 400 });
    }
    const key = slugify(label);
    if (!key) {
      return NextResponse.json({ error: "That role name doesn't produce a usable key — try including some letters or numbers." }, { status: 400 });
    }

    const columns = ["key", "label", "is_system"];
    const values = [key, label.trim(), false];
    for (const field of PERMISSION_FIELDS) {
      columns.push(COLUMN_BY_FIELD[field]);
      values.push(!!body[field]);
    }
    const maxOrder = await query(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM roles`);
    columns.push("sort_order");
    values.push(maxOrder.rows[0].m + 1);

    const placeholders = values.map((_, i) => `$${i + 1}`).join(",");
    const { rows } = await query(
      `INSERT INTO roles (${columns.join(",")}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return NextResponse.json({ role: rows[0] });
  } catch (e) {
    if (e.code === "23505") {
      return NextResponse.json({ error: "A role with that name (or a very similar one) already exists." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to create role." }, { status: e.status || 500 });
  }
}
