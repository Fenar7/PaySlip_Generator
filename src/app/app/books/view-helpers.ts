export type BooksBadgeVariant = "default" | "success" | "warning" | "danger" | "soon";

export function formatBooksMoney(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatBooksDate(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString();
}

export function booksStatusBadgeVariant(status: string): BooksBadgeVariant {
  const normalized = status.toUpperCase();

  if (
    normalized === "POSTED" ||
    normalized === "APPROVED" ||
    normalized === "PAID" ||
    normalized === "COMPLETED" ||
    normalized === "OPEN" ||
    normalized === "READY" ||
    normalized === "PASSED" ||
    normalized === "SETTLED" ||
    normalized === "MATCHED"
  ) {
    return "success";
  }

  if (
    normalized === "PENDING_APPROVAL" ||
    normalized === "PARTIALLY_PAID" ||
    normalized === "PROCESSING" ||
    normalized === "LOCKED" ||
    normalized === "BLOCKED" ||
    normalized === "PARTIALLY_MATCHED" ||
    normalized === "OVERDUE" ||
    normalized === "REOPENED"
  ) {
    return "warning";
  }

  if (
    normalized === "FAILED" ||
    normalized === "CANCELLED" ||
    normalized === "REVERSED" ||
    normalized === "UNMATCHED"
  ) {
    return "danger";
  }

  if (normalized === "DRAFT" || normalized === "PENDING" || normalized === "IGNORED") {
    return "default";
  }

  return "soon";
}
