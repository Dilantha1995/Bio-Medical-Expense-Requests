import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatDateInTz, formatDateTimeInTz } from "@/lib/formatDate";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: "#999", paddingBottom: 8, marginBottom: 8 },
  logo: { height: 38, objectFit: "contain" },
  logoSpacer: { width: 110 },
  headerCenter: { alignItems: "center" },
  companyName: { fontSize: 12, fontWeight: 700, color: "#1F3A5F" },
  docTitle: { fontSize: 10, marginTop: 2 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  label: { fontWeight: 700 },
  routeBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#999", borderRadius: 3, padding: 10, marginBottom: 10 },
  routeCol: { width: "42%" },
  routeArrow: { width: "16%", textAlign: "center", fontSize: 14, color: "#1F3A5F" },
  routeTitle: { fontSize: 7.5, color: "#666", marginBottom: 2 },
  routeValue: { fontSize: 10, fontWeight: 700 },
  statusBox: { borderWidth: 1, borderColor: "#c4b5fd", backgroundColor: "#f5f3ff", borderRadius: 3, padding: 8, marginBottom: 10 },
  statusTitle: { color: "#6d28d9", fontWeight: 700, fontSize: 9 },
  signBlock: { marginTop: 24, flexDirection: "row", justifyContent: "space-between" },
  signCol: { width: "45%" },
  signImg: { width: 90, height: 28, objectFit: "contain", marginBottom: 3 },
});

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

export default function TransferPDF({ doc, companyLogoBase64, companyName, timezone }) {
  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.headerRow}>
          {companyLogoBase64 ? <Image src={companyLogoBase64} style={styles.logo} /> : <View style={styles.logoSpacer} />}
          <View style={styles.headerCenter}>
            <Text style={styles.companyName}>{companyName || "ProSynergy Maldives Pvt. Ltd."}</Text>
            <Text style={styles.docTitle}>Machine Transfer Note</Text>
          </View>
          <View style={styles.logoSpacer} />
        </View>

        <View style={styles.metaRow}>
          <Text><Text style={styles.label}>Ref No: </Text>{doc.ref_number}</Text>
          <Text><Text style={styles.label}>Transfer Date: </Text>{formatDateInTz(doc.transfer_date, timezone)}</Text>
        </View>

        <View style={{ marginBottom: 10 }}>
          <Text><Text style={styles.label}>Machine: </Text>{doc.machine_name}{doc.machine_model ? ` (${doc.machine_model})` : ""}</Text>
          <Text><Text style={styles.label}>Serial Number: </Text>{doc.machine_serial_number}</Text>
        </View>

        <View style={styles.routeBox}>
          <View style={styles.routeCol}>
            <Text style={styles.routeTitle}>FROM</Text>
            <Text style={styles.routeValue}>{doc.from_facility_name || "-"}</Text>
            {doc.from_location_label ? <Text style={{ fontSize: 8, color: "#666" }}>{doc.from_location_label}</Text> : null}
          </View>
          <Text style={styles.routeArrow}>{"→"}</Text>
          <View style={styles.routeCol}>
            <Text style={styles.routeTitle}>TO</Text>
            <Text style={styles.routeValue}>{doc.to_facility_name}</Text>
            {doc.to_location_label ? <Text style={{ fontSize: 8, color: "#666" }}>{doc.to_location_label}</Text> : null}
          </View>
        </View>

        {doc.reason ? (
          <View style={{ marginBottom: 10 }}>
            <Text><Text style={styles.label}>Reason: </Text>{doc.reason}</Text>
          </View>
        ) : null}

        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>
            {doc.status === "received" ? "Receipt Confirmed" : "In Transit — awaiting receipt confirmation"}
          </Text>
        </View>

        <View style={styles.signBlock}>
          <SignCol label="Transferred By" name={doc.transferred_by_name}
            signatureBase64={doc.transferredBySignatureBase64} timestamp={doc.transferred_at} timezone={timezone} />
          <SignCol label="Received By" name={doc.received_by_name}
            signatureBase64={doc.receivedBySignatureBase64} timestamp={doc.received_at} timezone={timezone} />
        </View>
      </Page>
    </Document>
  );
}
