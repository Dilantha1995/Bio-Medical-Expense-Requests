import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireMachineManager } from "@/lib/auth";
import { pictureForMachineName } from "@/lib/machineDefaults";

// Fills in the default picture for any machine that doesn't have one yet
// and whose name matches a known model — for machines created (or
// imported) before that model had a bundled default photo.
export async function POST() {
  try {
    await requireMachineManager();
    const { rows } = await query(`SELECT id, name FROM machines WHERE picture_data IS NULL`);

    let updated = 0;
    for (const m of rows) {
      const picture = pictureForMachineName(m.name);
      if (!picture) continue;
      await query(`UPDATE machines SET picture_data=$1 WHERE id=$2`, [picture, m.id]);
      updated++;
    }

    return NextResponse.json({ checked: rows.length, updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to backfill pictures." }, { status: e.status || 500 });
  }
}
