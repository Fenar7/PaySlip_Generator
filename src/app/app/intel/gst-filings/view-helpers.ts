import type {
  GstFilingReconciliationStatus,
  GstFilingRunStatus,
  GstFilingSubmissionStatus,
} from "@/generated/prisma/client";

export function formatGstFilingDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatPeriodMonth(periodMonth: string): string {
  const [year, month] = periodMonth.split("-");
  const date = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, 1);
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function gstFilingStatusBadgeVariant(
  status: GstFilingRunStatus,
): "default" | "success" | "warning" | "danger" {
  if (status === "READY" || status === "RECONCILED") return "success";
  if (status === "BLOCKED" || status === "FAILED") return "danger";
  if (status === "SUBMISSION_PENDING" || status === "RECONCILING") return "warning";
  return "default";
}

export function gstSubmissionBadgeVariant(
  status: GstFilingSubmissionStatus,
): "default" | "success" | "warning" | "danger" {
  if (status === "ACKNOWLEDGED") return "success";
  if (status === "INTENT_RECORDED" || status === "SUBMITTED") return "warning";
  if (status === "FAILED" || status === "CANCELLED") return "danger";
  return "default";
}

export function gstReconciliationBadgeVariant(
  status: GstFilingReconciliationStatus,
): "default" | "success" | "warning" | "danger" {
  if (status === "MATCHED") return "success";
  if (status === "ACTION_REQUIRED" || status === "VARIANCE") return "warning";
  return "default";
}
