"use client";

import { useEffect, useState } from "react";

const PERMISSIONS = [
  { key: "canCheck", label: "Check / reject documents" },
  { key: "canFinalApprove", label: "Give final approval" },
  { key: "canManageMachines", label: "Manage machines" },
  { key: "canAccessPmDashboard", label: "PM & Installation dashboard" },
  { key: "canProcessPayments", label: "Process payments" },
  { key: "canViewAllRecords", label: "View all users' records" },
  { key: "canDeleteRecords", label: "Delete records" },
  { key: "canManageUsers", label: "Manage Users & Roles" },
  { key: "canManageConfig", label: "Manage Configure, PM columns/rules" },
];

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

function emptyForm() {
  const f = { label: "" };
  PERMISSIONS.forEach((p) => { f[p.key] = false; });
  return f;
}

export default function RolesClient() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/roles");
    const data = await res.json();
    setRoles(data.roles || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to create role."); return; }
    setForm(emptyForm());
    load();
  }

  async function updateRole(role, patch) {
    const res = await fetch(`/api/admin/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) load();
  }

  function handleRelabel(role) {
    const next = window.prompt("Rename role:", role.label);
    if (!next || !next.trim() || next.trim() === role.label) return;
    updateRole(role, { label: next.trim() });
  }

  async function handleDelete(role) {
    if (!window.confirm(`Delete the "${role.label}" role?`)) return;
    const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { window.alert(data.error || "Failed to delete role."); return; }
    load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-600">Add New Role</h2>
        <div className="max-w-sm">
          <label className="block text-xs font-medium text-gray-600 mb-1">Role Name</label>
          <input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. Accountant" className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PERMISSIONS.map((p) => (
            <label key={p.key} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form[p.key]}
                onChange={(e) => setForm({ ...form, [p.key]: e.target.checked })} />
              {p.label}
            </label>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving}
          className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
          {saving ? "Creating..." : "Create Role"}
        </button>
      </form>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Role</th>
              {PERMISSIONS.map((p) => <th key={p.key} className="p-3 whitespace-nowrap">{p.label}</th>)}
              <th className="p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={PERMISSIONS.length + 3} className="p-4 text-center text-gray-400">Loading...</td></tr>}
            {!loading && roles.length === 0 && (
              <tr><td colSpan={PERMISSIONS.length + 3} className="p-4 text-center text-gray-400">No roles yet.</td></tr>
            )}
            {roles.map((role) => (
              <tr key={role.id} className="border-b last:border-0">
                <td className="p-3">
                  <button type="button" onClick={() => handleRelabel(role)} className="font-medium hover:underline text-left">
                    {role.label}
                  </button>
                  <div className="text-xs text-gray-400 font-mono">{role.key}{role.is_system && " · system"}</div>
                </td>
                {PERMISSIONS.map((p) => (
                  <td key={p.key} className="p-3">
                    <input type="checkbox" checked={!!role[COLUMN_BY_FIELD[p.key]]} disabled={role.is_system}
                      onChange={(e) => updateRole(role, { [p.key]: e.target.checked })} />
                  </td>
                ))}
                <td className="p-3">
                  <input type="checkbox" checked={role.active} disabled={role.is_system}
                    onChange={(e) => updateRole(role, { active: e.target.checked })} />
                </td>
                <td className="p-3">
                  {!role.is_system && (
                    <button onClick={() => handleDelete(role)} className="text-xs text-brand-red hover:underline">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        System roles (Engineer, Approver, Admin) can be renamed but their permissions are locked to keep the app usable.
        Create a custom role for anything else — e.g. an "Accountant" who can process payments and view all records but not check/approve documents.
      </p>
    </div>
  );
}
