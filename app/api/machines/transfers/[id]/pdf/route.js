import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSession } from "@/lib/auth";
import { getMachineTransferById, getAppSettings } from "@/lib/data";
import { getLogoDataUris } from "@/lib/pdf/logos";
import TransferPDF from "@/lib/pdf/TransferPDF";

export const runtime = "nodejs";

const COMPANY_NAMES = {
  PSMS: "ProSynergy Maldives Pvt. Ltd.",
  PPM: "Pro Pharma Maldives Pvt. Ltd.",
};

export async function GET(req, { params }) {
  try {
    await requireSession();
    const record = await getMachineTransferById(params.id);
    if (!record) return new Response("Not found", { status: 404 });

    const appSettings = await getAppSettings();
    const signaturesOn = appSettings.signaturesEnabled !== "false";
    const doc = {
      ...record,
      transferredBySignatureBase64: signaturesOn ? (record.transferred_by_signature || null) : null,
      receivedBySignatureBase64: signaturesOn ? (record.received_by_signature || null) : null,
    };
    const { psms, ppm } = getLogoDataUris();
    const companyLogo = record.company === "PPM" ? ppm : psms;
    const companyName = COMPANY_NAMES[record.company] || COMPANY_NAMES.PSMS;

    const buffer = await renderToBuffer(
      React.createElement(TransferPDF, { doc, companyLogoBase64: companyLogo, companyName, timezone: appSettings.timezone })
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
