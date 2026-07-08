"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordClient({ fullName }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to change password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-8">
      <h1 className="text-lg font-semibold text-brand-navy mb-1">Set a new password</h1>
      <p className="text-sm text-gray-500 mb-6">
        Hi {fullName}, your account was just created or reset — please choose your own password before continuing.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current (temporary) password</label>
          <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" autoComplete="current-password" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" autoComplete="new-password" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
          <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm" autoComplete="new-password" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving}
          className="w-full bg-brand-navy text-white rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving..." : "Set Password & Continue"}
        </button>
      </form>
      <button onClick={handleLogout} className="w-full text-center text-xs text-gray-400 mt-4 hover:underline">
        Not you? Log out
      </button>
    </div>
  );
}
