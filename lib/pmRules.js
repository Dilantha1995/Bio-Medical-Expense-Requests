// Operators available per field type, and how to evaluate them.
// compare_value is always stored as text; we parse it based on field type.

export const OPERATORS_BY_TYPE = {
  text: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "contains", label: "contains" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  select: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  user: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
    { value: "is_empty", label: "is unassigned" },
    { value: "is_not_empty", label: "is assigned" },
  ],
  number: [
    { value: "equals", label: "equals" },
    { value: "greater_than", label: "is greater than" },
    { value: "less_than", label: "is less than" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  date: [
    { value: "before_today", label: "is before today (overdue)" },
    { value: "after_today", label: "is after today" },
    { value: "within_days", label: "is within N days from today" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function evaluateRule(rule, rawValue) {
  const value = rawValue === undefined || rawValue === null ? "" : String(rawValue);
  const cmp = rule.compare_value ?? "";

  switch (rule.operator) {
    case "is_empty":
      return value.trim() === "";
    case "is_not_empty":
      return value.trim() !== "";
    case "equals":
      return value.trim().toLowerCase() === cmp.trim().toLowerCase();
    case "not_equals":
      return value.trim().toLowerCase() !== cmp.trim().toLowerCase();
    case "contains":
      return value.toLowerCase().includes(cmp.toLowerCase());
    case "greater_than":
      return parseFloat(value) > parseFloat(cmp);
    case "less_than":
      return parseFloat(value) < parseFloat(cmp);
    case "before_today": {
      if (!value) return false;
      return new Date(value) < startOfToday();
    }
    case "after_today": {
      if (!value) return false;
      return new Date(value) > startOfToday();
    }
    case "within_days": {
      if (!value) return false;
      const days = parseInt(cmp, 10) || 0;
      const target = new Date(value);
      const today = startOfToday();
      const limit = new Date(today);
      limit.setDate(limit.getDate() + days);
      return target >= today && target <= limit;
    }
    default:
      return false;
  }
}

/**
 * Given all rules and a field key + value, return the first matching
 * active rule (rules should already be sorted by priority ascending).
 */
export function firstMatchingRule(rules, fieldKey, applyTo, value) {
  return rules.find((r) => r.active && r.field_key === fieldKey && r.apply_to === applyTo && evaluateRule(r, value)) || null;
}
