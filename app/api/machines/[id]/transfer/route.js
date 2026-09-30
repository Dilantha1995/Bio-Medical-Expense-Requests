import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireMachineManager } from "@/lib/auth";
import { nextRefNumber } from "@/lib/refnumber";

export async function POST(req, { params }) {
  try {
    const session = await requireMachineManager();
    const { toFacilityName, toLocationLabel, transferDate, reason } = await req.json();

    if (!toFacilityName || !toFacilityName.trim()) {
      return NextResponse.json({ error: "A destination facility is required." }, { status: 400 });
    }
    if (!transferDate) {
      return NextResponse.json({ error: "A transfer date is required." }, { status: 400 });
    }

    const { rows: machineRows } = await query("SELECT * FROM machines WHERE id=$1", [params.id]);
    const machine = machineRows[0];
    if (!machine) return NextResponse.json({ error: "Machine not found." }, { status: 404 });

    // If another machine is already pinned at the destination facility,
    // reuse its coordinates immediately rather than leaving this one
    // unpinned until someone revisits the Location tab.
    const { rows: siblingRows } = await query(
      `SELECT latitude, longitude FROM machines WHERE facility_name=$1 AND latitude IS NOT NULL LIMIT 1`,
      [toFacilityName.trim()]
    );
    const toLatitude = siblingRows[0]?.latitude ?? null;
    const toLongitude = siblingRows[0]?.longitude ?? null;

    const refNumber = await nextRefNumber("TRF", session.initials, machine.company);

    const { rows: transferRows } = await query(
      `INSERT INTO machine_transfers
         (ref_number, machine_id, company, from_facility_name, from_location_label, from_latitude, from_longitude,
          to_facility_name, to_location_label, to_latitude, to_longitude, transfer_date, reason, transferred_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [refNumber, machine.id, machine.company, machine.facility_name, machine.location_label, machine.latitude, machine.longitude,
        toFacilityName.trim(), toLocationLabel || null, toLatitude, toLongitude, transferDate, reason || null, session.id]
    );

    await query(
      `UPDATE machines SET facility_name=$1, location_label=$2, latitude=$3, longitude=$4 WHERE id=$5`,
      [toFacilityName.trim(), toLocationLabel || null, toLatitude, toLongitude, machine.id]
    );

    return NextResponse.json({ transfer: transferRows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to create transfer." }, { status: e.status || 500 });
  }
}
