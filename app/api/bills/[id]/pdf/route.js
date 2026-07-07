import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSession } from "@/lib/auth";
import { getBillSummaryById } from "@/lib/data";
import { getLogoDataUris } from "@/lib/pdf/logos";
import TravelFormPDF from "@/lib/pdf/TravelFormPDF";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    const session = await requireSession();
    const record = await getBillSummaryById(params.id);
    if (!record) return new Response("Not found", { status: 404 });
    if (session.role === "engineer" && record.engineer_id !== session.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const doc = { ...record, docTitle: "Summary of Bills", dateValue: record.summary_date };
    const { psms, ppm } = getLogoDataUris();

    const buffer = await renderToBuffer(
      React.createElement(TravelFormPDF, { doc, logoPsmsBase64: psms, logoProPharmaBase64: ppm })
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
