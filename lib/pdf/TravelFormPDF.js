import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { lineItemTotal, formatMVR } from "@/lib/calc";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: "#999", paddingBottom: 8, marginBottom: 8 },
  logo: { height: 34, objectFit: "contain" },
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
  signCol: { width: "30%" },
  label: { fontWeight: 700 },
});

const COLS = [
  { key: "idx", label: "#", w: "3%" },
  { key: "name", label: "Name", w: "10%" },
  { key: "designation", label: "Designation", w: "10%" },
  { key: "from", label: "From", w: "10%" },
  { key: "to", label: "To", w: "10%" },
  { key: "mode", label: "Mode", w: "6%" },
  { key: "days", label: "Days", w: "5%" },
  { key: "food", label: "Food", w: "6%" },
  { key: "accommodation", label: "Accom.", w: "8%" },
  { key: "airfare", label: "Air", w: "6%" },
  { key: "taxiFerry", label: "Taxi/Ferry", w: "8%" },
  { key: "seaTransport", label: "Sea", w: "6%" },
  { key: "landTransport", label: "Land", w: "6%" },
  { key: "others", label: "Others", w: "6%" },
  { key: "total", label: "Total", w: "8%" },
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

export default function TravelFormPDF({ doc, logoPsmsBase64, logoProPharmaBase64 }) {
  const items = doc.line_items || [];
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerRow}>
          {logoPsmsBase64 ? <Image src={logoPsmsBase64} style={styles.logo} /> : <View />}
          <View style={styles.headerCenter}>
            <Text style={styles.companyName}>ProSynergy Maldives Pvt. Ltd.</Text>
            <Text style={styles.docTitle}>{doc.docTitle}</Text>
            {doc.destination_label ? <Text style={styles.destination}>{doc.destination_label}</Text> : null}
          </View>
          {logoProPharmaBase64 ? <Image src={logoProPharmaBase64} style={styles.logo} /> : <View />}
        </View>

        <View style={styles.metaRow}>
          <Text><Text style={styles.label}>Ref No: </Text>{doc.ref_number}</Text>
          <Text><Text style={styles.label}>Date: </Text>{doc.dateValue ? new Date(doc.dateValue).toLocaleDateString() : "-"}</Text>
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
            <Text style={[styles.td, { width: "88%", textAlign: "right", fontWeight: 700 }]}>TOTAL</Text>
            <Text style={[styles.td, { width: "8%", fontWeight: 700 }]}>{formatMVR(doc.total_amount)}</Text>
          </View>
        </View>

        {doc.advance_received !== undefined && doc.advance_received !== null && (
          <View style={styles.section}>
            <Text><Text style={styles.label}>Advance Received: </Text>MVR {formatMVR(doc.advance_received)}</Text>
            <Text><Text style={styles.label}>Balance: </Text>MVR {formatMVR(doc.balance_due)}</Text>
          </View>
        )}

        <View style={{ marginTop: 8 }}>
          <Text><Text style={styles.label}>Purpose of Travel: </Text>{doc.purpose_of_travel || "-"}</Text>
          {doc.notes ? <Text style={{ marginTop: 4 }}><Text style={styles.label}>Notes: </Text>{doc.notes}</Text> : null}
          {doc.advance_ref_number ? <Text style={{ marginTop: 4 }}><Text style={styles.label}>Related Advance Request: </Text>{doc.advance_ref_number}</Text> : null}
        </View>

        <View style={styles.signBlock}>
          <View style={styles.signCol}>
            <Text style={styles.label}>Prepared By</Text>
            <Text>{doc.engineer_name} ({doc.engineer_initials})</Text>
            <Text>{doc.prepared_at ? new Date(doc.prepared_at).toLocaleString() : "-"}</Text>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.label}>Checked By</Text>
            <Text>{doc.checked_by_name || "Pending"}</Text>
            <Text>{doc.checked_at ? new Date(doc.checked_at).toLocaleString() : "-"}</Text>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.label}>Approved By</Text>
            <Text>{doc.approved_by_name || "Pending"}</Text>
            <Text>{doc.approved_at ? new Date(doc.approved_at).toLocaleString() : "-"}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
