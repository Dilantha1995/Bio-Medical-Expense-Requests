import { NextResponse } from "next/server";
import { requireMachineManager } from "@/lib/auth";
import { nextMachineSerial } from "@/lib/machineSerial";

export async function POST(req) {
  try {
    await requireMachineManager();
    const { prefix, pad } = await req.json();
    if (!prefix) return NextResponse.json({ error: "Prefix is required." }, { status: 400 });
    const serial = await nextMachineSerial(prefix, pad || 4);
    return NextResponse.json({ serial });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to generate serial." }, { status: e.status || 500 });
  }
}
