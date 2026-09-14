import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireCanManageUsers } from "@/lib/auth";

const COLUMN_BY_FIELD = {
  canCheck: "can_check",
  canFinalApprove: "can_final_approve",
  canManageMachines: "can_manage_machines",
  canAccessPmDashboard: "can_access_pm_dashboard",
  canProcessPayments: "can_process_payments",
  canManageUsers: "can_manage_users",
  canManageConfig: "can_manage_config",
  canDeleteRecords: "can_delete_records",
  canViewAllRecords: "can_view_all_records",
};

export async function PATCH(req, { params }) {
  try {
    await requireCanManageUsers();
    const body = await req.json();
    const { label, active, sortOrder, ...permissionFields } = body;

    const existing = await query(`SELECT * FROM roles WHERE id=$1`, [params.id]);
    const role = existing.rows[0];
    if (!role) return NextResponse.json({ error: "Role not found." }, { status: 404 });

    const sets = [];
    const values = [];
    let i = 1;

    if (label !== undefined) { sets.push(`label=$${i++}`); values.push(label.trim()); }
    if (typeof sortOrder === "number") { sets.push(`sort_order=$${i++}`); values.push(sortOrder); }
    // System roles (engineer/approver/admin) can only be relabeled or
    // reordered here — their permission bits are locked so an admin can't
    // accidentally lock themselves (or everyone) out.
    if (typeof active === "boolean") {
      if (role.is_system && !active) {
        return NextResponse.json({ error: "System roles can't be deactivated." }, { status: 400 });
      }
      sets.push(`active=$${i++}`);
      values.push(active);
    }
    const permissionKeys = Object.keys(permissionFields).filter((k) => COLUMN_BY_FIELD[k]);
    if (permissionKeys.length > 0) {
      if (role.is_system) {
        return NextResponse.json({ error: "System role permissions are locked. Create a custom role instead." }, { status: 400 });
      }
      for (const key of permissionKeys) {
        sets.push(`${COLUMN_BY_FIELD[key]}=$${i++}`);
        values.push(!!permissionFields[key]);
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    values.push(params.id);
    const { rows } = await query(`UPDATE roles SET ${sets.join(", ")} WHERE id=$${i} RETURNING *`, values);
    return NextResponse.json({ role: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to update role." }, { status: e.status || 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await requireCanManageUsers();
    const existing = await query(`SELECT * FROM roles WHERE id=$1`, [params.id]);
    const role = existing.rows[0];
    if (!role) return NextResponse.json({ error: "Role not found." }, { status: 404 });
    if (role.is_system) {
      return NextResponse.json({ error: "System roles can't be deleted." }, { status: 400 });
    }
    const inUse = await query(`SELECT 1 FROM users WHERE role=$1 LIMIT 1`, [role.key]);
    if (inUse.rows.length > 0) {
      return NextResponse.json({ error: "This role is still assigned to at least one user — reassign them first." }, { status: 400 });
    }
    await query(`DELETE FROM roles WHERE id=$1`, [params.id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to delete role." }, { status: e.status || 500 });
  }
}
