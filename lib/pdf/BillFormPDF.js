import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatMVR, EXPENSE_FIELDS } from "@/lib/calc";
import { billItemTotal, billCategoryTotals, categoryVariance, CATEGORY_LABELS } from "@/lib/billCalc";
import { formatDateInTz, formatDateTimeInTz } from "@/lib/formatDate";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: "#999", paddingBottom: 8, marginBottom: 8 },
  logo: { height: 34, objectFit: "contain" },
  logoSpacer: { width: 100 },
  headerCenter: { alignItems: "center" },
  companyName: { fontSize: 11, fontWeight: 700, color: "#1F3A5F" },
  docTitle: { fontSize: 9, marginTop: 2 },
  destination: { fontSize: 8, color: "#555", marginTop: 1 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  table: { display: "table", width: "100%", borderWidth: 1, borderColor: "#999" },
  tr: { flexDirection: "row" },
  th: { backgroundColor: "#f0f0f0", fontWeight: 700, padding: 3, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#999", fontSize: 6.5 },
  td: { padding: 3, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#999", fontSize: 6.5 },
  totalRow: { flexDirection: "row", backgroundColor: "#f5f5f5" },
  varianceBox: { width: "100%", borderWidth: 1, borderColor: "#ccc", borderRadius: 2, marginTop: 10, overflow: "hidden" },
  varianceTitle: { fontWeight: 700, fontSize: 8, padding: 6, backgroundColor: "#f5f5f5", borderBottomWidth: 1, borderColor: "#ccc" },
  varianceNote: { fontSize: 6.5, color: "#888", padding: 6 },
  signBlock: { marginTop: 24, flexDirection: "row", justifyContent: "space-between" },
  deletedBox: { borderWidth: 1.5, borderColor: "#dc2626", backgroundColor: "#fef2f2", borderRadius: 3, padding: 8, marginBottom: 10 },
  deletedTitle: { color: "#991b1b", fontWeight: 700, fontSize: 9, marginBottom: 2 },
  deletedText: { color: "#b91c1c", fontSize: 8 },
  paymentBox: { borderWidth: 1, borderColor: "#c4b5fd", backgroundColor: "#f5f3ff", borderRadius: 3, padding: 8, marginTop: 10 },
  paymentTitle: { color: "#6d28d9", fontWeight: 700, fontSize: 9, marginBottom: 2 },
  paymentText: { color: "#6d28d9", fontSize: 8 },
  slipImg: { maxHeight: 140, objectFit: "contain", marginTop: 4 },
  signCol: { width: "30%" },
  signImg: { width: 90, height: 28, objectFit: "contain", marginBottom: 3 },
  label: { fontWeight: 700 },
});

const CATEGORY_COLS = EXPENSE_FIELDS.map((key) => ({ key, label: CATEGORY_LABELS[key], w: "6%" }));

const COLS = [
  { key: "srn", label: "Srn", w: "4%" },
  { key: "billDate", label: "Bill Date", w: "7%" },
  { key: "billNo", label: "Bill No.", w: "6%" },
  { key: "supplierName", label: "Supplier Name", w: "10%" },
  { key: "description", label: "Description", w: "12%" },
  ...CATEGORY_COLS,
  { key: "supportingDocs", label: "Supporting Documents", w: "9%" },
  { key: "amount", label: "Total Amount", w: "10%" },
];

function cellValue(item, key, idx, timezone) {
  switch (key) {
    case "srn": return String(idx + 1);
    case "billDate": return item.billDate ? formatDateInTz(item.billDate, timezone) : "";
    case "amount": return formatMVR(billItemTotal(item));
    case "food": case "accommodation": case "airfare": case "taxiFerry":
    case "seaTransport": case "landTransport": case "others":
      return formatMVR(item[key]);
    default: return item[key] || "";
  }
}

function SignCol({ label, name, signatureBase64, timestamp, timezone }) {
  return (
    <View style={styles.signCol}>
      <Text style={styles.label}>{label}</Text>
      {signatureBase64 ? <Image src={signatureBase64} style={styles.signImg} /> : <View style={{ height: 28, marginBottom: 3 }} />}
      <Text>{name || "Pending"}</Text>
      <Text>{timestamp ? formatDateTimeInTz(timestamp, timezone) : "-"}</Text>
    </View>
  );
}

export default function BillFormPDF({ doc, companyLogoBase64, companyName, timezone, currency = "MVR" }) {
  const items = doc.line_items || [];
  const totals = billCategoryTotals(items);
  const variance = doc.advance_line_items && doc.advance_line_items.length > 0
    ? categoryVariance(items, doc.advance_line_items)
    : null;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {doc.deleted_at && (
          <View style={styles.deletedBox}>
            <Text style={styles.deletedTitle}>This entry was deleted</Text>
            <Text style={styles.deletedText}>By {doc.deleted_by_name || "an admin"} on {formatDateTimeInTz(doc.deleted_at, timezone)}</Text>
            <Text style={styles.deletedText}>Reason: {doc.deletion_reason}</Text>
          </View>
        )}
        <View style={styles.headerRow}>
          {companyLogoBase64 ? <Image src={companyLogoBase64} style={styles.logo} /> : <View style={styles.logoSpacer} />}
          <View style={styles.headerCenter}>
            <Text style={styles.companyName}>{companyName || "ProSynergy Maldives Pvt. Ltd."}</Text>
            <Text style={styles.docTitle}>{doc.docTitle}</Text>
            {doc.destination_label ? <Text style={styles.destination}>{doc.destination_label}</Text> : null}
          </View>
          <View style={styles.logoSpacer} />
        </View>

        <View style={styles.metaRow}>
          <Text><Text style={styles.label}>Ref No: </Text>{doc.ref_number}</Text>
          <Text><Text style={styles.label}>Date: </Text>{doc.dateValue ? formatDateInTz(doc.dateValue, timezone) : "-"}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tr}>
            {COLS.map((c) => (
              <Text key={c.key} style={[styles.th, { width: c.w }]}>{c.label}</Text>
            ))}
          </View>
          {items.map((item, i) => (
            <View style={styles.tr} key={i}>
              {COLS.map((c) => (
                <Text key={c.key} style={[styles.td, { width: c.w }]}>{cellValue(item, c.key, i, timezone)}</Text>
              ))}
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.td, { width: "39%", textAlign: "right", fontWeight: 700 }]}>TOTAL</Text>
            {CATEGORY_COLS.map((c) => (
              <Text key={c.key} style={[styles.td, { width: c.w, fontWeight: 700 }]}>{formatMVR(totals[c.key])}</Text>
            ))}
            <Text style={[styles.td, { width: "9%" }]}></Text>
            <Text style={[styles.td, { width: "10%", fontWeight: 700 }]}>{formatMVR(doc.total_amount)}</Text>
          </View>
        </View>

        {variance && (
          <View style={styles.varianceBox}>
            <Text style={styles.varianceTitle}>Advance vs Actual by Category</Text>
            <View style={styles.tr}>
              <Text style={[styles.th, { width: "40%" }]}>Category</Text>
              <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>Advance Taken</Text>
              <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>Actual Spent</Text>
              <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>Variance</Text>
            </View>
            {variance.map((r) => (
              <View style={styles.tr} key={r.key}>
                <Text style={[styles.td, { width: "40%", fontWeight: r.isTotal ? 700 : 400 }]}>{r.label}</Text>
                <Text style={[styles.td, { width: "20%", textAlign: "right", fontWeight: r.isTotal ? 700 : 400 }]}>{currency} {formatMVR(r.advance)}</Text>
                <Text style={[styles.td, { width: "20%", textAlign: "right", fontWeight: r.isTotal ? 700 : 400 }]}>{currency} {formatMVR(r.actual)}</Text>
                <Text style={[styles.td, { width: "20%", textAlign: "right", fontWeight: r.isTotal ? 700 : 400 }]}>{r.variance > 0 ? "+" : ""}{formatMVR(r.variance)}</Text>
              </View>
            ))}
            <Text style={styles.varianceNote}>Positive variance = spent more than advance; negative = under advance.</Text>
          </View>
        )}

        <View style={{ marginTop: 8 }}>
          <Text><Text style={styles.label}>Purpose of Travel: </Text>{doc.purpose_of_travel || "-"}</Text>
          {doc.notes ? <Text style={{ marginTop: 4 }}><Text style={styles.label}>Notes: </Text>{doc.notes}</Text> : null}
          {doc.advance_ref_number ? <Text style={{ marginTop: 4 }}><Text style={styles.label}>Related Advance Request: </Text>{doc.advance_ref_number}</Text> : null}
        </View>

        {doc.payment_status && (
          <View style={doc.payment_status === "rejected" ? styles.deletedBox : styles.paymentBox}>
            <Text style={doc.payment_status === "rejected" ? styles.deletedTitle : styles.paymentTitle}>
              Payment {doc.payment_status === "processed" ? "Processed" : doc.payment_status === "rejected" ? "Rejected" : "Processing"}
            </Text>
            {doc.payment_status === "processed" && (
              <>
                <Text style={styles.paymentText}>By {doc.payment_processed_by_name} on {formatDateTimeInTz(doc.payment_processed_at, timezone)}</Text>
                {doc.payment_slip_data && <Image src={doc.payment_slip_data} style={styles.slipImg} />}
              </>
            )}
            {doc.payment_status === "rejected" && (
              <Text style={styles.deletedText}>Reason: {doc.payment_rejection_reason}</Text>
            )}
          </View>
        )}

        <View style={styles.signBlock}>
          <SignCol label="Prepared By" name={`${doc.engineer_name} (${doc.engineer_initials})`}
            signatureBase64={doc.preparedBySignatureBase64} timestamp={doc.prepared_at} timezone={timezone} />
          <SignCol label="Checked By" name={doc.checked_by_name}
            signatureBase64={doc.checkedBySignatureBase64} timestamp={doc.checked_at} timezone={timezone} />
          <SignCol label="Approved By" name={doc.approved_by_name}
            signatureBase64={doc.approvedBySignatureBase64} timestamp={doc.approved_at} timezone={timezone} />
        </View>
      </Page>
    </Document>
  );
}
