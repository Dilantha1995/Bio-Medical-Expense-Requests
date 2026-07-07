// Maldives work week is Sunday–Thursday; Friday (5) and Saturday (6) are
// the weekend. Used to calculate the 3-working-day bill submission deadline.

function isWeekend(date) {
  const day = date.getDay(); // 0=Sun ... 6=Sat
  return day === 5 || day === 6;
}

export function addWorkingDays(startDate, n) {
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  let remaining = n;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) remaining--;
  }
  return d;
}

/**
 * Given the date an engineer returned to the office, and whether a bill
 * summary has already been submitted for that trip, returns one of:
 * 'awaiting_return' | 'pending' | 'overdue' | 'submitted'
 */
export function billSubmissionStatus(returnedAt, hasBillSummary, workingDaysAllowed = 3) {
  if (hasBillSummary) return "submitted";
  if (!returnedAt) return "awaiting_return";
  const deadline = addWorkingDays(returnedAt, workingDaysAllowed);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today > deadline ? "overdue" : "pending";
}
