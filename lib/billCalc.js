import { EXPENSE_FIELDS } from "./calc";

export const SUPPORTING_DOC_OPTIONS = ["Bill", "Bill & Transfer Slip", "Transfer Slip", "No Supporting"];

export const CATEGORY_LABELS = {
  food: "Food",
  accommodation: "Accommodation",
  airfare: "Air Fare",
  taxiFerry: "Taxi/Ferry",
  seaTransport: "Sea Transport",
  landTransport: "Land Transport",
  others: "Others",
};

export function emptyBillItem() {
  return {
    billDate: "",
    billNo: "",
    supplierName: "",
    description: "",
    food: "",
    accommodation: "",
    airfare: "",
    taxiFerry: "",
    seaTransport: "",
    landTransport: "",
    others: "",
    supportingDocs: "",
  };
}

/**
 * Bills submitted before the per-category columns existed only have a
 * single `amount` + `natureOfPayment`. Treat that amount as filed under
 * "Others" so historical bills still total correctly and still show up
 * somewhere in the per-category breakdown, instead of just vanishing.
 */
function normalizeBillItem(item) {
  const hasCategoryAmount = EXPENSE_FIELDS.some((f) => parseFloat(item[f]) > 0);
  if (hasCategoryAmount || !item.amount) return item;
  return { ...item, others: item.amount };
}

export function billItemTotal(item) {
  const n = normalizeBillItem(item);
  return EXPENSE_FIELDS.reduce((sum, f) => sum + (parseFloat(n[f]) || 0), 0);
}

export function billGrandTotal(items) {
  return items.reduce((sum, item) => sum + billItemTotal(item), 0);
}

export function billCategoryTotals(items) {
  const totals = {};
  for (const f of EXPENSE_FIELDS) totals[f] = 0;
  for (const item of items) {
    const n = normalizeBillItem(item);
    for (const f of EXPENSE_FIELDS) totals[f] += parseFloat(n[f]) || 0;
  }
  return totals;
}

/**
 * Groups bill line items by supporting-document type, for the small
 * summary shown at the bottom of the Bill Summary document.
 */
export function summarizeBillItems(items) {
  const bySupportingDocs = {};
  for (const item of items) {
    const docKey = item.supportingDocs || "Not specified";
    if (!bySupportingDocs[docKey]) bySupportingDocs[docKey] = { count: 0, total: 0 };
    bySupportingDocs[docKey].count += 1;
    bySupportingDocs[docKey].total += billItemTotal(item);
  }
  return { bySupportingDocs };
}

