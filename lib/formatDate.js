export function formatDateInTz(value, timezone, opts = {}) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "Indian/Maldives",
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...opts,
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleDateString();
  }
}

/**
 * Returns a date as YYYY-MM-DD as it reads in the given timezone (not UTC),
 * so "today"/"tomorrow" for reminders match the app's configured timezone
 * rather than the server's.
 */
export function dateStringInTz(date, timezone) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "Indian/Maldives",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function todayInTz(timezone) {
  return dateStringInTz(new Date(), timezone);
}

export function addDaysToDateString(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateTimeInTz(value, timezone) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "Indian/Maldives",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}
