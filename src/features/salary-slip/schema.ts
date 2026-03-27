import { z } from "zod";
import { salarySlipDefaultValues } from "@/features/salary-slip/constants";
import type { SalarySlipFormValues } from "@/features/salary-slip/types";

const brandingSchema = z.object({
  companyName: z.string().trim(),
  address: z.string().trim(),
  email: z.string().trim(),
  phone: z.string().trim(),
  logoDataUrl: z.string().optional(),
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Enter a valid hex color."),
});

const visibilitySchema = z.object({
  showAddress: z.boolean(),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  showEmployeeId: z.boolean(),
  showDepartment: z.boolean(),
  showDesignation: z.boolean(),
  showBankDetails: z.boolean(),
  showAttendance: z.boolean(),
  showNotes: z.boolean(),
  showSignature: z.boolean(),
});

const lineItemSchema = z.object({
  label: z.string().trim().min(1, "Label is required."),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required.")
    .refine((value) => Number.isFinite(Number(value)), "Enter a valid amount.")
    .refine((value) => Number(value) >= 0, "Amount cannot be negative."),
});

export const salarySlipDocumentSchema = z.object({
  templateId: z.enum(["corporate-clean", "modern-premium"]),
  title: z.string().trim().min(1),
  branding: brandingSchema,
  employeeName: z.string().trim().min(1),
  employeeId: z.string().trim().optional(),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  payPeriodLabel: z.string().trim().min(1),
  payDate: z.string().trim().optional(),
  workingDays: z.string().trim().optional(),
  paidDays: z.string().trim().optional(),
  leaveDays: z.string().trim().optional(),
  lossOfPayDays: z.string().trim().optional(),
  paymentMethod: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
  earnings: z.array(
    z.object({
      label: z.string().trim().min(1),
      amount: z.number().finite(),
      amountFormatted: z.string().trim().min(1),
    }),
  ),
  deductions: z.array(
    z.object({
      label: z.string().trim().min(1),
      amount: z.number().finite(),
      amountFormatted: z.string().trim().min(1),
    }),
  ),
  totalEarnings: z.number().finite(),
  totalDeductions: z.number().finite(),
  netSalary: z.number().finite(),
  totalEarningsFormatted: z.string().trim().min(1),
  totalDeductionsFormatted: z.string().trim().min(1),
  netSalaryFormatted: z.string().trim().min(1),
  netSalaryInWords: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  preparedBy: z.string().trim().optional(),
  visibility: visibilitySchema,
});

export const salarySlipFormSchema = z
  .object({
    templateId: z.enum(["corporate-clean", "modern-premium"]),
    branding: brandingSchema,
    employeeName: z.string().trim().min(1, "Employee name is required."),
    employeeId: z.string().trim(),
    department: z.string().trim(),
    designation: z.string().trim(),
    payPeriodLabel: z.string().trim().min(1, "Salary period is required."),
    payDate: z.string().trim(),
    workingDays: z.string().trim(),
    paidDays: z.string().trim(),
    leaveDays: z.string().trim(),
    lossOfPayDays: z.string().trim(),
    paymentMethod: z.string().trim(),
    bankName: z.string().trim(),
    bankAccountNumber: z.string().trim(),
    earnings: z
      .array(lineItemSchema)
      .min(1, "Add at least one earning row.")
      .refine(
        (rows) => rows.some((row) => Number(row.amount) > 0),
        "At least one earning amount must be greater than zero.",
      ),
    deductions: z.array(
      z.object({
        label: z.string().trim(),
        amount: z
          .string()
          .trim()
          .refine(
            (value) => value.length === 0 || Number.isFinite(Number(value)),
            "Enter a valid amount.",
          )
          .refine(
            (value) => value.length === 0 || Number(value) >= 0,
            "Amount cannot be negative.",
          ),
      }),
    ),
    notes: z.string().trim(),
    preparedBy: z.string().trim(),
    visibility: visibilitySchema,
  })
  .superRefine((values, context) => {
    const workingDays = Number(values.workingDays || 0);
    const paidDays = Number(values.paidDays || 0);

    if (values.workingDays && !Number.isFinite(workingDays)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["workingDays"],
        message: "Working days must be a valid number.",
      });
    }

    if (values.paidDays && !Number.isFinite(paidDays)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidDays"],
        message: "Paid days must be a valid number.",
      });
    }

    if (
      values.workingDays &&
      values.paidDays &&
      Number.isFinite(workingDays) &&
      Number.isFinite(paidDays) &&
      paidDays > workingDays
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidDays"],
        message: "Paid days cannot exceed working days.",
      });
    }
  });

export type SalarySlipFormSchema = z.infer<typeof salarySlipFormSchema>;

export function validateSalarySlipForm(
  values: SalarySlipFormValues = salarySlipDefaultValues,
) {
  return salarySlipFormSchema.safeParse(values);
}
