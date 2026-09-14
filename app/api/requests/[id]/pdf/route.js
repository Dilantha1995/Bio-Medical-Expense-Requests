import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSession } from "@/lib/auth";
import { getAdvanceRequestById, getAppSettings } from "@/lib/data";
import { getLogoDataUris } from "@/lib/pdf/logos";
import TravelFormPDF from "@/lib/pdf/TravelFormPDF";

export const runtime = "nodejs";

const COMPANY_NAMES = {
  PSMS: "ProSynergy Maldives Pvt. Ltd.",
  PPM: "Pro Pharma Maldives Pvt. Ltd.",
};

export async function GET(req, { params }) {
  try {
    const session = await requireSession();
    const record = await getAdvanceRequestById(params.id);
    if (!record) return new Response("Not found", { status: 404 });
    if (!session.canViewAllRecords && record.engineer_id !== session.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const appSettings = await getAppSettings();
    const signaturesOn = appSettings.signaturesEnabled !== "false";
    const doc = {
      ...record,
      docTitle: "Travel Advance Request",
      dateValue: record.request_date,
      preparedBySignatureBase64: signaturesOn ? (record.prepared_by_signature || null) : null,
      checkedBySignatureBase64: signaturesOn ? (record.checked_by_signature || null) : null,
      approvedBySignatureBase64: signaturesOn ? (record.approved_by_signature || null) : null,
    };
    const { psms, ppm } = getLogoDataUris();
    const companyLogo = record.company === "PPM" ? ppm : psms;
    const companyName = COMPANY_NAMES[record.company] || COMPANY_NAMES.PSMS;

    const buffer = await renderToBuffer(
      React.createElement(TravelFormPDF, { doc, companyLogoBase64: companyLogo, companyName, timezone: appSettings.timezone })
    );

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${record.ref_number.replace(/\//g, "-")}.pdf"`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(e.message || "Failed to generate PDF", { status: e.status || 500 });
  }
}
