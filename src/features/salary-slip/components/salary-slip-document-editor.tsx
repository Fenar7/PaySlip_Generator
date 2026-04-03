"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { normalizeSalarySlip } from "@/features/salary-slip/utils/normalize-salary-slip";
import type { SalarySlipFormValues } from "@/features/salary-slip/types";
import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import {
  InlineDateField,
  InlineTextArea,
  InlineTextField,
} from "@/components/document/inline-edit-fields";
import { cn } from "@/lib/utils";

function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-red-50 hover:text-red-500"
      aria-label="Remove row"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-[var(--accent)] transition-opacity hover:opacity-75"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
      {label}
    </button>
  );
}

const cellClass = "px-2 py-1.5 text-sm";
const thClass = cn(cellClass, "text-left text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]");

export function SalarySlipDocumentEditor() {
  const { control } = useFormContext<SalarySlipFormValues>();

  const {
    fields: earningFields,
    append: appendEarning,
    remove: removeEarning,
  } = useFieldArray({ control, name: "earnings" });

  const {
    fields: deductionFields,
    append: appendDeduction,
    remove: removeDeduction,
  } = useFieldArray({ control, name: "deductions" });

  const watchedValues = useWatch({ control }) as SalarySlipFormValues;
  const doc = normalizeSalarySlip(watchedValues);
  const branding = doc.branding;

  return (
    <div className="mx-auto w-full max-w-[794px]">
      <div className="rounded-2xl border border-[var(--border-strong)] bg-white shadow-[var(--shadow-card)]" style={{ minHeight: 1000 }}>
        {/* Accent stripe */}
        <div className="h-2 w-full rounded-t-2xl" style={{ background: branding.accentColor || "var(--accent)" }} />

        <div className="p-10 pt-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <DocumentBrandMark
                branding={branding}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)]"
                initialsClassName="text-base font-semibold text-[var(--foreground)]"
              />
              <div className="min-w-0 flex-1">
                <InlineTextField
                  name="branding.companyName"
                  placeholder="Company Name"
                  className="text-lg font-semibold text-[var(--foreground)]"
                />
                <InlineTextArea
                  name="branding.address"
                  placeholder="Company address"
                  className="mt-0.5 text-sm text-[var(--foreground-soft)]"
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold uppercase tracking-wide text-[var(--foreground)]">Salary Slip</p>
              <div className="mt-2 flex items-center justify-end gap-1.5">
                <InlineTextField name="payPeriodLabel" placeholder="Pay Period" className="w-32 text-right text-sm text-[var(--foreground-soft)]" />
                <span className="text-[var(--muted-foreground)]">·</span>
                <InlineTextField name="month" placeholder="Month" className="w-20 text-right text-sm" />
                <InlineTextField name="year" placeholder="Year" className="w-14 text-right text-sm" />
              </div>
              <div className="mt-1 flex items-center justify-end gap-2 text-sm">
                <span className="text-[var(--muted-foreground)]">Pay Date</span>
                <InlineDateField name="payDate" className="w-36 text-right" />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-[var(--border-soft)]" />

          {/* Employee Info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Employee</p>
              <InlineTextField name="employeeName" placeholder="Employee Name" className="mt-1 font-medium" />
              <InlineTextField name="employeeId" placeholder="Employee ID" className="mt-0.5 text-sm text-[var(--foreground-soft)]" />
              <InlineTextField name="department" placeholder="Department" className="mt-0.5 text-sm text-[var(--foreground-soft)]" />
              <InlineTextField name="designation" placeholder="Designation" className="mt-0.5 text-sm text-[var(--foreground-soft)]" />
            </div>
            <div>
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Details</p>
              <div className="mt-1 space-y-0.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs text-[var(--muted-foreground)]">PAN</span>
                  <InlineTextField name="pan" placeholder="PAN" className="text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs text-[var(--muted-foreground)]">UAN</span>
                  <InlineTextField name="uan" placeholder="UAN" className="text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs text-[var(--muted-foreground)]">Work Location</span>
                  <InlineTextField name="workLocation" placeholder="Location" className="text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs text-[var(--muted-foreground)]">Joining Date</span>
                  <InlineDateField name="joiningDate" className="text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Attendance row */}
          <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
            {[
              { label: "Working Days", name: "workingDays" },
              { label: "Paid Days", name: "paidDays" },
              { label: "Leave Days", name: "leaveDays" },
              { label: "LOP Days", name: "lossOfPayDays" },
            ].map((item) => (
              <div key={item.name} className="min-w-[80px]">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{item.label}</p>
                <InlineTextField name={item.name} placeholder="—" className="mt-0.5 text-sm font-medium tabular-nums" />
              </div>
            ))}
          </div>

          {/* Earnings + Deductions tables */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {/* Earnings */}
            <div>
              <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)]">
                      <th className={cn(thClass, "w-[60%]")}>Earnings</th>
                      <th className={cn(thClass, "text-right")}>Amount (₹)</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {earningFields.map((field, index) => (
                      <tr key={field.id} className="border-b border-[var(--border-soft)] last:border-0">
                        <td className={cellClass}>
                          <InlineTextField name={`earnings.${index}.label`} placeholder="Earning item" />
                        </td>
                        <td className={cn(cellClass, "text-right")}>
                          <InlineTextField name={`earnings.${index}.amount`} placeholder="0.00" className="text-right tabular-nums" />
                        </td>
                        <td className="pr-1">
                          {earningFields.length > 1 && <RemoveRowButton onClick={() => removeEarning(index)} />}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-[var(--border-soft)] bg-[var(--surface-soft)]">
                      <td className={cn(cellClass, "font-semibold")}>Total Earnings</td>
                      <td className={cn(cellClass, "text-right font-semibold tabular-nums")}>{doc.totalEarningsFormatted}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
              <AddRowButton label="Add earning" onClick={() => appendEarning({ label: "", amount: "" })} />
            </div>

            {/* Deductions */}
            <div>
              <div className="overflow-hidden rounded-xl border border-[var(--border-soft)]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)]">
                      <th className={cn(thClass, "w-[60%]")}>Deductions</th>
                      <th className={cn(thClass, "text-right")}>Amount (₹)</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {deductionFields.map((field, index) => (
                      <tr key={field.id} className="border-b border-[var(--border-soft)] last:border-0">
                        <td className={cellClass}>
                          <InlineTextField name={`deductions.${index}.label`} placeholder="Deduction item" />
                        </td>
                        <td className={cn(cellClass, "text-right")}>
                          <InlineTextField name={`deductions.${index}.amount`} placeholder="0.00" className="text-right tabular-nums" />
                        </td>
                        <td className="pr-1">
                          {deductionFields.length > 1 && <RemoveRowButton onClick={() => removeDeduction(index)} />}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-[var(--border-soft)] bg-[var(--surface-soft)]">
                      <td className={cn(cellClass, "font-semibold")}>Total Deductions</td>
                      <td className={cn(cellClass, "text-right font-semibold tabular-nums")}>{doc.totalDeductionsFormatted}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
              <AddRowButton label="Add deduction" onClick={() => appendDeduction({ label: "", amount: "" })} />
            </div>
          </div>

          {/* Net Salary */}
          <div className="mt-4 flex items-center justify-end gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-5 py-4">
            <div>
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Net Salary</p>
              <p className="mt-0.5 text-xs italic text-[var(--muted-foreground)]">{doc.netSalaryInWords || "—"}</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-[var(--foreground)]">{doc.netSalaryFormatted}</p>
          </div>

          {/* Disbursement */}
          <div className="mt-6 rounded-xl border border-[var(--border-soft)] p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Disbursement</p>
            <div className="mt-2 grid gap-y-1 sm:grid-cols-4">
              {[
                { label: "Method", name: "paymentMethod" },
                { label: "Bank", name: "bankName" },
                { label: "Account No.", name: "bankAccountNumber" },
                { label: "IFSC", name: "bankIfsc" },
              ].map((item) => (
                <div key={item.name}>
                  <span className="text-xs text-[var(--muted-foreground)]">{item.label}</span>
                  <InlineTextField name={item.name} placeholder="—" className="text-sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Notes + Prepared By */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Notes</p>
              <InlineTextArea name="notes" placeholder="Any additional notes…" className="mt-1 text-sm" />
            </div>
            <div className="flex flex-col items-end justify-end">
              <div className="w-44 text-center">
                <div className="h-12 border-b border-[var(--border-soft)]" />
                <InlineTextField name="preparedBy" placeholder="Prepared By" className="mt-1 text-center text-xs text-[var(--muted-foreground)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
