import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getMachineTransferById } from "@/lib/data";

export async function GET(req, { params }) {
  try {
    await requireSession();
    const record = await getMachineTransferById(params.id);
    if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ transfer: record });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const session = await requireSession();
    const { action } = await req.json();
    if (action !== "confirm_receipt") {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const before = await getMachineTransferById(params.id);
    if (!before) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (before.status === "received") {
      return NextResponse.json({ error: "This transfer has already been confirmed received." }, { status: 400 });
    }

    await query(
      `UPDATE machine_transfers SET status='received', received_by=$1, received_at=now() WHERE id=$2`,
      [session.id, params.id]
    );

    const updated = await getMachineTransferById(params.id);
    return NextResponse.json({ transfer: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
