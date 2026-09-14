export function emptyShippingItem() {
  return { date: "", description: "", dnNumber: "", refNo: "", location: "", expenseType: "", amount: "", currency: "MVR" };
}

export function shippingItemTotal(item) {
  return parseFloat(item.amount) || 0;
}

export function shippingGrandTotal(items) {
  return items.reduce((sum, item) => sum + shippingItemTotal(item), 0);
}

/**
 * Line items can mix currencies (e.g. a boat charge in MVR alongside a
 * courier fee in USD), so the single total_amount is a same-currency-only
 * convenience; this breakdown is what's actually meaningful to read.
 */
export function summarizeShippingItemsByCurrency(items) {
  const byCurrency = {};
  for (const item of items) {
    const key = item.currency || "MVR";
    if (!byCurrency[key]) byCurrency[key] = { count: 0, total: 0 };
    byCurrency[key].count += 1;
    byCurrency[key].total += shippingItemTotal(item);
  }
  return byCurrency;
}
