import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { lineItemTotal, formatMVR } from "@/lib/calc";
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
  section: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
  signBlock: { marginTop: 24, flexDirection: "row", justifyContent: "space-between" },
  deletedBox: { borderWidth: 1.5, borderColor: "#dc2626", backgroundColor: "#fef2f2", borderRadius: 3, padding: 6, marginBottom: 8 },
  deletedTitle: { color: "#991b1b", fontWeight: 700, fontSize: 8, marginBottom: 2 },
  deletedText: { color: "#b91c1c", fontSize: 7 },
  paymentBox: { borderWidth: 1, borderColor: "#c4b5fd", backgroundColor: "#f5f3ff", borderRadius: 3, padding: 6, marginTop: 8 },
  paymentTitle: { color: "#6d28d9", fontWeight: 700, fontSize: 8, marginBottom: 2 },
  paymentText: { color: "#6d28d9", fontSize: 7 },
  slipImg: { maxHeight: 100, objectFit: "contain", marginTop: 4 },
  signCol: { width: "30%" },
  signImg: { height: 28, objectFit: "contain", marginBottom: 3 },
  label: { fontWeight: 700 },
});

const COLS = [
  { key: "idx", label: "#", w: "4%" },
  { key: "from", label: "From", w: "14%" },
  { key: "to", label: "To", w: "14%" },
  { key: "mode", label: "Mode", w: "7%" },
  { key: "days", label: "Days", w: "6%" },
  { key: "food", label: "Food", w: "7%" },
  { key: "accommodation", label: "Accom.", w: "9%" },
  { key: "airfare", label: "Air", w: "7%" },
  { key: "taxiFerry", label: "Taxi/Ferry", w: "9%" },
  { key: "seaTransport", label: "Sea", w: "7%" },
  { key: "landTransport", label: "Land", w: "7%" },
  { key: "others", label: "Others", w: "7%" },
  { key: "total", label: "Total", w: "9%" },
];

function cellValue(item, key, idx) {
  switch (key) {
    case "idx": return String(idx + 1);
    case "from": return `${item.fromLocation || ""}\n${item.fromDate || ""}`;
    case "to": return `${item.toLocation || ""}\n${item.toDate || ""}`;
    case "total": return formatMVR(lineItemTotal(item));
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

export default function TravelFormPDF({ doc, companyLogoBase64, companyName, timezone }) {
  const items = doc.line_items || [];
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
                <Text key={c.key} style={[styles.td, { width: c.w }]}>{cellValue(item, c.key, i)}</Text>
              ))}
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.td, { width: "91%", textAlign: "right", fontWeight: 700 }]}>TOTAL</Text>
            <Text style={[styles.td, { width: "9%", fontWeight: 700 }]}>{formatMVR(doc.total_amount)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          <Text><Text style={styles.label}>Purpose of Travel: </Text>{doc.purpose_of_travel || "-"}</Text>
          {doc.notes ? <Text style={{ marginTop: 4 }}><Text style={styles.label}>Notes: </Text>{doc.notes}</Text> : null}
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
