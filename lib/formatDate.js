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
