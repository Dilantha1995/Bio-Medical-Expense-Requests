"use client";

import { useEffect, useState } from "react";

const ROLES = [
  { value: "engineer", label: "Engineer" },
  { value: "approver", label: "Approver" },
  { value: "admin", label: "Admin" },
];

function emptyForm() {
  return { username: "", password: "", fullName: "", initials: "", designation: "Biomedical Engineer", role: "engineer", canFinalApprove: false, canManageMachines: false, canAccessPmDashboard: false };
}

export default function AdminUsersClient() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to create user."); return; }
    setForm(emptyForm());
    load();
  }

  async function updateUser(id, patch) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  function handleResetPassword(id) {
    const pw = window.prompt("New password (min 6 characters):");
    if (!pw) return;
    updateUser(id, { newPassword: pw });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm grid sm:grid-cols-3 gap-3">
        <h2 className="sm:col-span-3 text-sm font-semibold text-gray-600">Add New User</h2>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
          <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Initials (for ref numbers)</label>
          <input required maxLength={4} value={form.initials} onChange={(e) => setForm({ ...form, initials: e.target.value.toUpperCase() })}
            className="w-full border rounded-md px-3 py-2 text-sm" placeholder="e.g. AH" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
          <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
          <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {form.role === "approver" && (
          <div className="flex items-center gap-2 sm:col-span-3">
            <input type="checkbox" id="cfa" checked={form.canFinalApprove}
              onChange={(e) => setForm({ ...form, canFinalApprove: e.target.checked })} />
            <label htmlFor="cfa" className="text-sm text-gray-600">Can give final approval (e.g. BD Director / MD)</label>
          </div>
        )}
        <div className="flex items-center gap-2 sm:col-span-3">
          <input type="checkbox" id="cmm" checked={form.canManageMachines}
            onChange={(e) => setForm({ ...form, canManageMachines: e.target.checked })} />
          <label htmlFor="cmm" className="text-sm text-gray-600">Can add/edit machines (in addition to admins, who always can)</label>
        </div>
        <div className="flex items-center gap-2 sm:col-span-3">
          <input type="checkbox" id="capd" checked={form.canAccessPmDashboard}
            onChange={(e) => setForm({ ...form, canAccessPmDashboard: e.target.checked })} />
          <label htmlFor="capd" className="text-sm text-gray-600">Can access the PM &amp; Installation Schedule dashboard</label>
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
        <div className="sm:col-span-3">
          <button type="submit" disabled={saving}
            className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
            {saving ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Name</th>
              <th className="p-3">Username</th>
              <th className="p-3">Initials</th>
              <th className="p-3">Role</th>
              <th className="p-3">Final Approver</th>
              <th className="p-3">Manage Machines</th>
              <th className="p-3">PM Access</th>
              <th className="p-3">Active</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-4 text-center text-gray-400">Loading...</td></tr>}
            {!loading && users.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-center text-gray-400">No users yet.</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3">{u.full_name}</td>
                <td className="p-3">{u.username}</td>
                <td className="p-3">{u.initials}</td>
                <td className="p-3">
                  <select value={u.role} onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    className="border rounded px-2 py-1 text-xs">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <input type="checkbox" checked={u.can_final_approve}
                    onChange={(e) => updateUser(u.id, { canFinalApprove: e.target.checked })} />
                </td>
                <td className="p-3">
                  <input type="checkbox" checked={u.can_manage_machines}
                    onChange={(e) => updateUser(u.id, { canManageMachines: e.target.checked })} />
                </td>
                <td className="p-3">
                  <input type="checkbox" checked={u.can_access_pm_dashboard}
                    onChange={(e) => updateUser(u.id, { canAccessPmDashboard: e.target.checked })} />
                </td>
                <td className="p-3">
                  <input type="checkbox" checked={u.active}
                    onChange={(e) => updateUser(u.id, { active: e.target.checked })} />
                </td>
                <td className="p-3">
                  <button onClick={() => handleResetPassword(u.id)} className="text-xs text-brand-navy hover:underline">
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
