import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSession } from "@/lib/auth";
import { getBillSummaryById, getAppSettings } from "@/lib/data";
import { getLogoDataUris } from "@/lib/pdf/logos";
import BillFormPDF from "@/lib/pdf/BillFormPDF";

export const runtime = "nodejs";

const COMPANY_NAMES = {
  PSMS: "ProSynergy Maldives Pvt. Ltd.",
  PPM: "Pro Pharma Maldives Pvt. Ltd.",
};

export async function GET(req, { params }) {
  try {
    const session = await requireSession();
    const record = await getBillSummaryById(params.id);
    if (!record) return new Response("Not found", { status: 404 });
    if (session.role === "engineer" && record.engineer_id !== session.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const appSettings = await getAppSettings();
    const doc = {
      ...record,
      docTitle: "Summary of Bills",
      dateValue: record.summary_date,
      preparedBySignatureBase64: record.prepared_by_signature || null,
      checkedBySignatureBase64: record.checked_by_signature || null,
      approvedBySignatureBase64: record.approved_by_signature || null,
    };
    const { psms, ppm } = getLogoDataUris();
    const companyLogo = record.company === "PPM" ? ppm : psms;
    const companyName = COMPANY_NAMES[record.company] || COMPANY_NAMES.PSMS;

    const buffer = await renderToBuffer(
      React.createElement(BillFormPDF, { doc, companyLogoBase64: companyLogo, companyName, timezone: appSettings.timezone })
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
