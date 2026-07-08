import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession, verifyPassword, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSession();
    const { rows } = await query(
      `SELECT id, username, full_name, initials, designation, role, phone, photo_data, signature_data,
              bank_name, bank_account_name, bank_account_number
       FROM users WHERE id=$1`,
      [session.id]
    );
    if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ user: rows[0] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { fullName, phone, photoData, signatureData, currentPassword, newPassword, bankName, bankAccountName, bankAccountNumber } = body;

    const sets = [];
    const values = [];
    let i = 1;

    if (fullName) { sets.push(`full_name=$${i++}`); values.push(fullName); }
    if (phone !== undefined) { sets.push(`phone=$${i++}`); values.push(phone); }
    if (photoData !== undefined) { sets.push(`photo_data=$${i++}`); values.push(photoData); }
    if (signatureData !== undefined) { sets.push(`signature_data=$${i++}`); values.push(signatureData); }
    if (bankName !== undefined) { sets.push(`bank_name=$${i++}`); values.push(bankName); }
    if (bankAccountName !== undefined) { sets.push(`bank_account_name=$${i++}`); values.push(bankAccountName); }
    if (bankAccountNumber !== undefined) { sets.push(`bank_account_number=$${i++}`); values.push(bankAccountNumber); }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Enter your current password to set a new one." }, { status: 400 });
      }
      const { rows } = await query(`SELECT password_hash FROM users WHERE id=$1`, [session.id]);
      const ok = await verifyPassword(currentPassword, rows[0]?.password_hash || "");
      if (!ok) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
      }
      sets.push(`password_hash=$${i++}`);
      values.push(await hashPassword(newPassword));
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    values.push(session.id);
    const { rows } = await query(
      `UPDATE users SET ${sets.join(", ")} WHERE id=$${i}
       RETURNING id, username, full_name, initials, designation, role, phone, photo_data, signature_data,
                 bank_name, bank_account_name, bank_account_number`,
      values
    );
    return NextResponse.json({ user: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to update profile." }, { status: e.status || 500 });
  }
}
