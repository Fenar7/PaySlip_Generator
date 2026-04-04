import type {
  SalarySlipDocument,
  SalarySlipExportFormat,
} from "@/features/docs/salary-slip/types";

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildSalarySlipFilename(
  document: SalarySlipDocument,
  format: SalarySlipExportFormat,
) {
  const employeeSegment = sanitizeSegment(document.employeeName) || "employee";
  const periodSegment = sanitizeSegment(document.payPeriodLabel) || "salary-slip";

  return `salary-slip-${employeeSegment}-${periodSegment}.${format}`;
}
