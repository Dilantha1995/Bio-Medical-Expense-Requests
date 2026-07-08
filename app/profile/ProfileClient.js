"use client";

import { useEffect, useRef, useState } from "react";
import { resizeImageFile } from "@/lib/imageResize";

export default function ProfileClient() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [phone, setPhone] = useState("");
  const [photoData, setPhotoData] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const photoInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok || !d.user) {
          setLoadError(d.error || "Could not load your profile.");
          setLoading(false);
          return;
        }
        setUser(d.user);
        setPhone(d.user.phone || "");
        setPhotoData(d.user.photo_data || null);
        setSignatureData(d.user.signature_data || null);
        setBankName(d.user.bank_name || "");
        setBankAccountName(d.user.bank_account_name || "");
        setBankAccountNumber(d.user.bank_account_number || "");
        setLoading(false);
      })
      .catch(() => {
        setLoadError("Could not load your profile.");
        setLoading(false);
      });
  }, []);

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizeImageFile(file, 300, 0.8);
    setPhotoData(resized);
  }

  async function handleSignatureChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizeImageFile(file, 400, 0.85);
    setSignatureData(resized);
  }

  async function handleSaveProfile() {
    setError(""); setSuccess("");
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, photoData, signatureData, bankName, bankAccountName, bankAccountNumber }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to save."); return; }
    setSuccess("Profile updated.");
  }

  async function handleChangePassword() {
    setError(""); setSuccess("");
    if (!newPassword) { setError("Enter a new password."); return; }
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to change password."); return; }
    setSuccess("Password changed.");
    setCurrentPassword(""); setNewPassword("");
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (loadError || !user) return <p className="text-sm text-red-600">{loadError || "Could not load your profile."}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-brand-navy">My Profile</h1>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-sm text-gray-500 mb-4">
          {user.full_name} ({user.initials}) · {user.designation || user.role}
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Profile Photo</label>
            <div className="flex items-center gap-3">
              {photoData ? (
                <img src={photoData} alt="Profile" className="w-16 h-16 rounded-full object-cover border" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs border">No photo</div>
              )}
              <button type="button" onClick={() => photoInputRef.current?.click()} className="text-sm border rounded-md px-3 py-1.5">
                Upload
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Signature (used on documents)</label>
            <div className="flex items-center gap-3">
              {signatureData ? (
                <img src={signatureData} alt="Signature" className="h-16 border rounded bg-white object-contain px-2" />
              ) : (
                <div className="h-16 w-32 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs border">No signature</div>
              )}
              <button type="button" onClick={() => signatureInputRef.current?.click()} className="text-sm border rounded-md px-3 py-1.5">
                Upload
              </button>
              <input ref={signatureInputRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureChange} />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">A photo of your signature on plain paper/whiteboard, or a signed transparent PNG, both work.</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full sm:w-64 border rounded-md px-3 py-2 text-sm" />
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-semibold text-gray-600 mb-2">Bank Account (for advance payment transfers)</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account Name</label>
              <input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
              <input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {success && <p className="text-sm text-green-600 mt-3">{success}</p>}

        <button onClick={handleSaveProfile} disabled={saving}
          className="mt-4 bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">Change Password</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <button onClick={handleChangePassword} disabled={saving}
          className="mt-4 border border-brand-navy text-brand-navy px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
          Change Password
        </button>
      </div>
    </div>
  );
}
