import type {
  SalarySlipDocument,
  SalarySlipFormValues,
  SalarySlipLineItem,
} from "@/features/docs/salary-slip/types";
import { amountToWords } from "@/features/docs/voucher/utils/amount-to-words";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function buildPayPeriodLabel(month: string, year: string, fallback: string) {
  const cleanMonth = month.trim();
  const cleanYear = year.trim();

  if (cleanMonth && cleanYear) {
    return `${cleanMonth} ${cleanYear}`.trim();
  }

  return fallback.trim();
}

function normalizeNumberText(value: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return `${parsed}`;
}

function normalizeLineItems(
  rows: Array<{ label: string; amount: string }>,
  options?: { keepEmpty?: boolean },
) {
  const items: SalarySlipLineItem[] = [];

  for (const row of rows) {
    const label = row.label.trim();
    const amount = Number(row.amount || 0);

    if (!label && !row.amount && !options?.keepEmpty) {
      continue;
    }

    items.push({
      label: label || "Untitled",
      amount: Number.isFinite(amount) ? amount : 0,
      amountFormatted: formatCurrency(Number.isFinite(amount) ? amount : 0),
    });
  }

  return items;
}

export function normalizeSalarySlip(values: SalarySlipFormValues): SalarySlipDocument {
  const earnings = normalizeLineItems(values.earnings);
  const deductions = normalizeLineItems(values.deductions);
  const totalEarnings = earnings.reduce((sum, row) => sum + row.amount, 0);
  const totalDeductions = deductions.reduce((sum, row) => sum + row.amount, 0);
  const netSalary = totalEarnings - totalDeductions;
  const visibility = values.visibility;

  return {
    templateId: values.templateId,
    title: "Salary Slip",
    branding: values.branding,
    employeeName: values.employeeName.trim(),
    employeeId: visibility.showEmployeeId
      ? values.employeeId.trim() || undefined
      : undefined,
    department: visibility.showDepartment
      ? values.department.trim() || undefined
      : undefined,
    designation: visibility.showDesignation
      ? values.designation.trim() || undefined
      : undefined,
    pan: visibility.showPan ? values.pan.trim() || undefined : undefined,
    uan: visibility.showUan ? values.uan.trim() || undefined : undefined,
    payPeriodLabel: buildPayPeriodLabel(
      values.month,
      values.year,
      values.payPeriodLabel,
    ),
    payDate: formatDate(values.payDate),
    workingDays: visibility.showAttendance
      ? normalizeNumberText(values.workingDays)
      : undefined,
    paidDays: visibility.showAttendance
      ? normalizeNumberText(values.paidDays)
      : undefined,
    leaveDays: visibility.showAttendance
      ? normalizeNumberText(values.leaveDays)
      : undefined,
    lossOfPayDays: visibility.showAttendance
      ? normalizeNumberText(values.lossOfPayDays)
      : undefined,
    paymentMethod: visibility.showBankDetails
      ? values.paymentMethod.trim() || undefined
      : undefined,
    bankName: visibility.showBankDetails
      ? values.bankName.trim() || undefined
      : undefined,
    bankAccountNumber: visibility.showBankDetails
      ? values.bankAccountNumber.trim() || undefined
      : undefined,
    bankIfsc: visibility.showBankDetails
      ? values.bankIfsc.trim() || undefined
      : undefined,
    joiningDate: visibility.showJoiningDate
      ? formatDate(values.joiningDate)
      : undefined,
    workLocation: visibility.showWorkLocation
      ? values.workLocation.trim() || undefined
      : undefined,
    earnings,
    deductions,
    totalEarnings,
    totalDeductions,
    netSalary,
    totalEarningsFormatted: formatCurrency(totalEarnings),
    totalDeductionsFormatted: formatCurrency(totalDeductions),
    netSalaryFormatted: formatCurrency(netSalary),
    netSalaryInWords: amountToWords(Math.max(netSalary, 0)),
    notes: visibility.showNotes ? values.notes.trim() || undefined : undefined,
    preparedBy: visibility.showSignature
      ? values.preparedBy.trim() || undefined
      : undefined,
    visibility,
  };
}
