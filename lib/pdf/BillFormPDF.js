import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatMVR } from "@/lib/calc";
import { billItemTotal, summarizeBillItems } from "@/lib/billCalc";
import { formatDateInTz, formatDateTimeInTz } from "@/lib/formatDate";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: "#999", paddingBottom: 8, marginBottom: 8 },
  logo: { height: 38, objectFit: "contain" },
  logoSpacer: { width: 110 },
  headerCenter: { alignItems: "center" },
  companyName: { fontSize: 12, fontWeight: 700, color: "#1F3A5F" },
  docTitle: { fontSize: 10, marginTop: 2 },
  destination: { fontSize: 8, color: "#555", marginTop: 1 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  table: { display: "table", width: "100%", borderWidth: 1, borderColor: "#999" },
  tr: { flexDirection: "row" },
  th: { backgroundColor: "#f0f0f0", fontWeight: 700, padding: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#999", fontSize: 7.5 },
  td: { padding: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#999", fontSize: 7.5 },
  totalRow: { flexDirection: "row", backgroundColor: "#f5f5f5" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  summaryBox: { width: "48%", borderWidth: 1, borderColor: "#ccc", borderRadius: 2, padding: 6 },
  summaryTitle: { fontWeight: 700, marginBottom: 4, fontSize: 8 },
  summaryLine: { flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, marginBottom: 2 },
  signBlock: { marginTop: 24, flexDirection: "row", justifyContent: "space-between" },
  signCol: { width: "30%" },
  signImg: { height: 28, objectFit: "contain", marginBottom: 3 },
  label: { fontWeight: 700 },
});

const COLS = [
  { key: "srn", label: "Srn", w: "6%" },
  { key: "description", label: "Description", w: "26%" },
  { key: "billNo", label: "Bill No.", w: "14%" },
  { key: "natureOfPayment", label: "Nature of Payment", w: "20%" },
  { key: "supportingDocs", label: "Supporting Documents", w: "20%" },
  { key: "amount", label: "Total Amount", w: "14%" },
];

function cellValue(item, key, idx) {
  switch (key) {
    case "srn": return String(idx + 1);
    case "amount": return formatMVR(billItemTotal(item));
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

export default function BillFormPDF({ doc, companyLogoBase64, companyName, timezone }) {
  const items = doc.line_items || [];
  const summary = summarizeBillItems(items);

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
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
            <Text style={[styles.td, { width: "86%", textAlign: "right", fontWeight: 700 }]}>TOTAL</Text>
            <Text style={[styles.td, { width: "14%", fontWeight: 700 }]}>{formatMVR(doc.total_amount)}</Text>
          </View>
        </View>

        {items.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>By Supporting Documents</Text>
              {Object.entries(summary.bySupportingDocs).map(([k, v]) => (
                <View style={styles.summaryLine} key={k}>
                  <Text>{k} ({v.count})</Text>
                  <Text>{formatMVR(v.total)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>By Nature of Payment</Text>
              {Object.entries(summary.byNature).map(([k, v]) => (
                <View style={styles.summaryLine} key={k}>
                  <Text>{k} ({v.count})</Text>
                  <Text>{formatMVR(v.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {doc.advance_received !== undefined && doc.advance_received !== null && (
          <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
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
