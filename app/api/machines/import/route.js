import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { query } from "@/lib/db";
import { requireMachineManager } from "@/lib/auth";
import { matchMachineModel } from "@/lib/machineDefaults";

export const runtime = "nodejs";

// Header names (lowercased, substring match) this importer knows how to
// find in an arbitrary spreadsheet. Built against the PSMS/PPM analyzer
// movement trackers, but works for any sheet that has a "Serial Number"
// column plus a product-name-ish column.
const HEADER_MAP = {
  serial: ["serial number"],
  name: ["sales description", "product/service name"],
  facility: ["current location"],
  installDate: ["installation completed date"],
  status: ["installation status", "status of machine"],
  remarks: ["remarks"],
};

function findHeaderRow(rows) {
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const row = (rows[r] || []).map((c) => String(c || "").trim().toLowerCase());
    if (row.some((c) => c === "serial number")) return r;
  }
  return -1;
}

function findCol(headerRow, candidates) {
  for (const cand of candidates) {
    const idx = headerRow.findIndex((c) => c === cand);
    if (idx !== -1) return idx;
  }
  // fall back to a substring match if no exact header matched
  for (const cand of candidates) {
    const idx = headerRow.findIndex((c) => c.includes(cand));
    if (idx !== -1) return idx;
  }
  return -1;
}

function sheetCompany(sheetName) {
  if (/psms/i.test(sheetName)) return "PSMS";
  if (/ppm/i.test(sheetName)) return "PPM";
  return null;
}

function toDateString(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value.toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  return null;
}

export async function POST(req) {
  try {
    const session = await requireMachineManager();
    const form = await req.formData();
    const file = form.get("file");
    if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "That file is too large (max 15MB)." }, { status: 400 });
    }

    // xlsx (SheetJS) has known ReDoS/prototype-pollution advisories with no
    // npm-published fix; restricted to admins (requireMachineManager) who
    // are trusted to upload their own workbook, same trust level as every
    // other admin-only import/config action in this app.
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    const knownFacilities = new Set();
    const sheetResults = [];
    const createdMachines = [];

    for (const sheetName of workbook.SheetNames) {
      const company = sheetCompany(sheetName);
      if (!company) continue; // not a PSMS/PPM sheet — skip (summary/rollup tabs also lack a Serial Number column)

      const sheet = workbook.Sheets[sheetName];
      // raw (not raw:false) so cellDates:true actually yields JS Date
      // objects for date cells instead of pre-formatted display strings.
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      const headerIdx = findHeaderRow(rows);
      if (headerIdx === -1) continue;

      const headerRow = rows[headerIdx].map((c) => String(c || "").trim().toLowerCase());
      const col = {
        serial: findCol(headerRow, HEADER_MAP.serial),
        name: findCol(headerRow, HEADER_MAP.name),
        facility: findCol(headerRow, HEADER_MAP.facility),
        installDate: findCol(headerRow, HEADER_MAP.installDate),
        status: findCol(headerRow, HEADER_MAP.status),
        remarks: findCol(headerRow, HEADER_MAP.remarks),
      };
      // Require both a serial and a name column — a sheet that only
      // incidentally has a cell matching "serial number" somewhere (like a
      // rollup/summary tab) won't have a real product-name column too, so
      // this keeps those from producing bogus "Unknown" machines.
      if (col.serial === -1 || col.name === -1) continue;

      let created = 0, duplicates = 0, skippedNoSerial = 0;

      for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row) continue;
        const serialRaw = row[col.serial];
        const serial = serialRaw !== null && serialRaw !== undefined ? String(serialRaw).trim() : "";
        // Real serials always contain a digit; this also filters out
        // placeholder text ("Pending", "NA", "TBD") and stray totals rows.
        if (!serial || !/\d/.test(serial)) { skippedNoSerial++; continue; }

        const rawName = col.name !== -1 ? row[col.name] : null;
        const matched = matchMachineModel(rawName);
        const name = matched ? matched.name : (rawName ? String(rawName).trim() : "Unknown");
        const category = matched ? matched.category : null;
        const picture = matched ? matched.picture : null;

        const facility = col.facility !== -1 && row[col.facility] ? String(row[col.facility]).trim() : null;
        if (facility) knownFacilities.add(facility);

        const installDate = col.installDate !== -1 ? toDateString(row[col.installDate]) : null;
        const status = col.status !== -1 && row[col.status] ? String(row[col.status]).trim() : null;
        const remarks = col.remarks !== -1 && row[col.remarks] ? String(row[col.remarks]).trim() : null;
        const notes = [status && status.toLowerCase() !== "installed" && status.toLowerCase() !== "done" ? `Status: ${status}` : null, remarks]
          .filter(Boolean).join(" — ") || null;

        const { rows: inserted } = await query(
          `INSERT INTO machines (name, model, serial_number, category, facility_name, location_label, install_date, notes, created_by, company, picture_data)
           VALUES ($1,NULL,$2,$3,$4,NULL,$5,$6,$7,$8,$9)
           ON CONFLICT (serial_number) DO NOTHING
           RETURNING *`,
          [name, serial, category, facility, installDate, notes, session.id, company, picture]
        );
        if (inserted[0]) { created++; createdMachines.push(inserted[0]); }
        else duplicates++;
      }

      sheetResults.push({ sheet: sheetName, company, created, duplicates, skippedNoSerial });
    }

    for (const facility of knownFacilities) {
      await query(
        `INSERT INTO option_lists (list_key, label, sort_order) VALUES ('machine_facility', $1, 0) ON CONFLICT (list_key, label) DO NOTHING`,
        [facility]
      );
    }

    const totalCreated = sheetResults.reduce((s, r) => s + r.created, 0);
    return NextResponse.json({ sheetResults, totalCreated, createdMachines: createdMachines.slice(0, 200) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Import failed." }, { status: e.status || 500 });
  }
}
