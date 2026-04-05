import type { BrandingConfig } from "@/lib/branding";

export type SalarySlipTemplateId = "corporate-clean" | "modern-premium" | "classic-formal" | "detailed-breakdown" | "compact-payslip";

export type SalarySlipLineItemFormValues = {
  label: string;
  amount: string;
};

export type SalarySlipVisibilityConfig = {
  showAddress: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showEmployeeId: boolean;
  showDepartment: boolean;
  showDesignation: boolean;
  showPan: boolean;
  showUan: boolean;
  showBankDetails: boolean;
  showJoiningDate: boolean;
  showWorkLocation: boolean;
  showAttendance: boolean;
  showNotes: boolean;
  showSignature: boolean;
};

export type SalarySlipFormValues = {
  templateId: SalarySlipTemplateId;
  branding: BrandingConfig;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  pan: string;
  uan: string;
  payPeriodLabel: string;
  month: string;
  year: string;
  payDate: string;
  workingDays: string;
  paidDays: string;
  leaveDays: string;
  lossOfPayDays: string;
  paymentMethod: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  joiningDate: string;
  workLocation: string;
  earnings: SalarySlipLineItemFormValues[];
  deductions: SalarySlipLineItemFormValues[];
  notes: string;
  preparedBy: string;
  visibility: SalarySlipVisibilityConfig;
};

export type SalarySlipLineItem = {
  label: string;
  amount: number;
  amountFormatted: string;
};

export type SalarySlipDocument = {
  templateId: SalarySlipTemplateId;
  title: string;
  branding: BrandingConfig;
  employeeName: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  pan?: string;
  uan?: string;
  payPeriodLabel: string;
  payDate?: string;
  workingDays?: string;
  paidDays?: string;
  leaveDays?: string;
  lossOfPayDays?: string;
  paymentMethod?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  joiningDate?: string;
  workLocation?: string;
  earnings: SalarySlipLineItem[];
  deductions: SalarySlipLineItem[];
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  totalEarningsFormatted: string;
  totalDeductionsFormatted: string;
  netSalaryFormatted: string;
  netSalaryInWords: string;
  notes?: string;
  preparedBy?: string;
  visibility: SalarySlipVisibilityConfig;
};

export type SalarySlipExportFormat = "pdf" | "png";
