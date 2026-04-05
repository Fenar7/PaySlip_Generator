/**
 * CRON job utilities — secret validation & date arithmetic
 */

export function validateCronSecret(request: Request): boolean {
  const header = request.headers.get("authorization");
  if (!header) return false;
  const token = header.replace(/^Bearer\s+/i, "");
  return token === process.env.CRON_SECRET;
}

export function calculateNextRunAt(
  currentDate: Date,
  frequency: string
): Date {
  const next = new Date(currentDate);
  switch (frequency) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}
