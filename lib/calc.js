export const EXPENSE_FIELDS = [
  "food",
  "accommodation",
  "airfare",
  "taxiFerry",
  "seaTransport",
  "landTransport",
  "others",
];

export function emptyLineItem() {
  return {
    fromLocation: "",
    fromDate: "",
    toLocation: "",
    toDate: "",
    mode: "",
    days: "",
    food: "",
    accommodation: "",
    airfare: "",
    taxiFerry: "",
    seaTransport: "",
    landTransport: "",
    others: "",
  };
}

export function lineItemTotal(item) {
  return EXPENSE_FIELDS.reduce((sum, f) => sum + (parseFloat(item[f]) || 0), 0);
}

export function grandTotal(items) {
  return items.reduce((sum, item) => sum + lineItemTotal(item), 0);
}

export function formatMVR(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
