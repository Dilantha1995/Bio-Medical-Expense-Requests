export const SUPPORTING_DOC_OPTIONS = ["Bill", "Bill & Transfer Slip", "Transfer Slip", "No Supporting"];

export function emptyBillItem() {
  return { description: "", billNo: "", natureOfPayment: "", amount: "", supportingDocs: "" };
}

export function billItemTotal(item) {
  return parseFloat(item.amount) || 0;
}

export function billGrandTotal(items) {
  return items.reduce((sum, item) => sum + billItemTotal(item), 0);
}

/**
 * Groups bill line items by supporting-document type and by nature of
 * payment, returning counts and subtotals for the small summary shown at
 * the bottom of the Bill Summary document.
 */
export function summarizeBillItems(items) {
  const bySupportingDocs = {};
  const byNature = {};

  for (const item of items) {
    const amount = billItemTotal(item);

    const docKey = item.supportingDocs || "Not specified";
    if (!bySupportingDocs[docKey]) bySupportingDocs[docKey] = { count: 0, total: 0 };
    bySupportingDocs[docKey].count += 1;
    bySupportingDocs[docKey].total += amount;

    const natureKey = item.natureOfPayment || "Not specified";
    if (!byNature[natureKey]) byNature[natureKey] = { count: 0, total: 0 };
    byNature[natureKey].count += 1;
    byNature[natureKey].total += amount;
  }

  return { bySupportingDocs, byNature };
}

/**
 * Compares the advance amount an engineer took against what they actually
 * spent, for the "Advance vs Spend Analysis" shown on Bill Summary
 * documents submitted against an advance payment.
 */
export function advanceVsSpendAnalysis(totalAmount, advanceReceived) {
  const spendAmount = parseFloat(totalAmount) || 0;
  const advance = parseFloat(advanceReceived) || 0;
  const difference = advance - spendAmount;
  return {
    advanceReceived: advance,
    spendAmount,
    difference: Math.abs(difference),
    isExcess: difference >= 0,
  };
}
