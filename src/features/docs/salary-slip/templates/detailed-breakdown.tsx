"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import {
  InlineNumberField,
  InlineTextArea,
  InlineTextField,
} from "@/components/document/inline-edit-fields";
import { cn } from "@/lib/utils";
import type { SalarySlipDocument, SalarySlipFormValues } from "@/features/docs/salary-slip/types";
import { normalizeSalarySlip } from "@/features/docs/salary-slip/utils/normalize-salary-slip";

type SalarySlipTemplateProps = {
  document: SalarySlipDocument;
  mode?: "preview" | "print" | "pdf" | "png" | "edit";
};

function PercentageRow({
  label,
  amountFormatted,
  percentage,
  variant,
}: {
  label: string;
  amountFormatted: string;
  percentage: number;
  variant: "accent" | "muted";
}) {
  return (
    <div className="group relative py-3">
      <div className="flex items-center justify-between text-sm">
        <p className="relative z-10 text-[rgba(29,23,16,0.82)]">{label}</p>
        <div className="relative z-10 flex items-center gap-3">
          <span className="text-xs text-[rgba(29,23,16,0.45)]">
            {percentage.toFixed(1)}%
          </span>
          <p className="font-medium text-[var(--voucher-ink)]">{amountFormatted}</p>
        </div>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(29,23,16,0.06)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(percentage, 2)}%`,
            backgroundColor:
              variant === "accent"
                ? "var(--voucher-accent)"
                : "rgba(29,23,16,0.25)",
            opacity: variant === "accent" ? 0.7 : 0.6,
          }}
        />
      </div>
    </div>
  );
}

export function DetailedBreakdownSalarySlipTemplate({
  document,
  mode = "preview",
}: SalarySlipTemplateProps) {
  if (mode === "edit") {
    return <DetailedBreakdownEditor />;
  }

  const printLikeMode = mode !== "preview";

  const workingDaysNum = parseFloat(document.workingDays || "0");
  const paidDaysNum = parseFloat(document.paidDays || "0");
  const leaveDaysNum = parseFloat(document.leaveDays || "0");
  const lopDaysNum = parseFloat(document.lossOfPayDays || "0");
  const totalAttendanceDays = Math.max(workingDaysNum, paidDaysNum + leaveDaysNum + lopDaysNum, 1);

  return (
    <div className="space-y-6 text-[var(--voucher-ink)]">
      {/* Header: logo+name left, pay slip+period right */}
      <section className="document-break-inside-avoid flex items-start justify-between gap-6">
        <div className="flex items-start gap-3">
          <DocumentBrandMark branding={document.branding} />
          <div>
            <h2 className="text-lg font-semibold">
              {document.branding.companyName || "Slipwise"}
            </h2>
            <div className="mt-1 space-y-0.5 text-xs leading-5 text-[rgba(29,23,16,0.6)]">
              {document.visibility.showAddress && document.branding.address ? (
                <p>{document.branding.address}</p>
              ) : null}
              {document.visibility.showEmail && document.branding.email ? (
                <p>{document.branding.email}</p>
              ) : null}
              {document.visibility.showPhone && document.branding.phone ? (
                <p>{document.branding.phone}</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[rgba(29,23,16,0.45)]">
            Pay Slip
          </p>
          <p className="mt-1 text-sm font-medium">{document.payPeriodLabel}</p>
          {document.payDate ? (
            <p className="mt-0.5 text-xs text-[rgba(29,23,16,0.55)]">
              Paid on {document.payDate}
            </p>
          ) : null}
        </div>
      </section>

      {/* Net salary hero */}
      <section className="document-break-inside-avoid py-4 text-center">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[rgba(29,23,16,0.45)]">
          Net Salary
        </p>
        <p className="mt-2 text-4xl font-bold">{document.netSalaryFormatted}</p>
        <div
          className="mx-auto mt-2 h-[3px] w-24 rounded-full"
          style={{ backgroundColor: "var(--voucher-accent)" }}
        />
        <p className="mt-2 text-xs italic text-[rgba(29,23,16,0.55)]">
          {document.netSalaryInWords}
        </p>
      </section>

      {/* Three-column summary strip */}
      <section
        className={cn(
          "document-break-inside-avoid grid gap-4",
          printLikeMode ? "grid-cols-3" : "sm:grid-cols-3",
        )}
      >
        {[
          { label: "Gross Earnings", value: document.totalEarningsFormatted },
          { label: "Total Deductions", value: document.totalDeductionsFormatted },
          { label: "Net Pay", value: document.netSalaryFormatted },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border-2 px-4 py-3 text-center"
            style={{ borderColor: "var(--voucher-accent)" }}
          >
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.5)]">
              {label}
            </p>
            <p className="mt-1 text-lg font-bold">{value}</p>
          </div>
        ))}
      </section>

      {/* Earnings table with percentage bars */}
      <section className="document-break-inside-avoid">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
          Earnings Breakdown
        </p>
        <div className="mt-3 divide-y divide-[rgba(29,23,16,0.07)]">
          {document.earnings.map((row) => (
            <PercentageRow
              key={`earn-${row.label}`}
              label={row.label}
              amountFormatted={row.amountFormatted}
              percentage={
                document.totalEarnings > 0
                  ? (row.amount / document.totalEarnings) * 100
                  : 0
              }
              variant="accent"
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-[rgba(29,23,16,0.04)] px-4 py-2.5 text-sm">
          <p className="font-semibold text-[rgba(29,23,16,0.7)]">Total Earnings</p>
          <p className="font-bold">{document.totalEarningsFormatted}</p>
        </div>
      </section>

      {/* Deductions table with percentage bars */}
      <section className="document-break-inside-avoid">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
          Deductions Breakdown
        </p>
        <div className="mt-3 divide-y divide-[rgba(29,23,16,0.07)]">
          {document.deductions.map((row) => (
            <PercentageRow
              key={`ded-${row.label}`}
              label={row.label}
              amountFormatted={row.amountFormatted}
              percentage={
                document.totalDeductions > 0
                  ? (row.amount / document.totalDeductions) * 100
                  : 0
              }
              variant="muted"
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-[rgba(29,23,16,0.04)] px-4 py-2.5 text-sm">
          <p className="font-semibold text-[rgba(29,23,16,0.7)]">Total Deductions</p>
          <p className="font-bold">{document.totalDeductionsFormatted}</p>
        </div>
      </section>

      {/* Employee profile card */}
      <section className="document-break-inside-avoid rounded-lg border border-[rgba(29,23,16,0.1)] bg-[rgba(255,255,255,0.95)] p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
          Employee Details
        </p>
        <div
          className={cn(
            "mt-4 grid gap-x-6 gap-y-3 text-sm",
            printLikeMode ? "grid-cols-3" : "sm:grid-cols-2 md:grid-cols-3",
          )}
        >
          <div>
            <p className="text-xs text-[rgba(29,23,16,0.45)]">Name</p>
            <p className="font-medium">{document.employeeName}</p>
          </div>
          {document.visibility.showEmployeeId && document.employeeId ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">Employee ID</p>
              <p className="font-medium">{document.employeeId}</p>
            </div>
          ) : null}
          {document.visibility.showDepartment && document.department ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">Department</p>
              <p className="font-medium">{document.department}</p>
            </div>
          ) : null}
          {document.visibility.showDesignation && document.designation ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">Designation</p>
              <p className="font-medium">{document.designation}</p>
            </div>
          ) : null}
          {document.visibility.showPan && document.pan ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">PAN</p>
              <p className="font-medium">{document.pan}</p>
            </div>
          ) : null}
          {document.visibility.showUan && document.uan ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">UAN</p>
              <p className="font-medium">{document.uan}</p>
            </div>
          ) : null}
          {document.visibility.showJoiningDate && document.joiningDate ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">Joining Date</p>
              <p className="font-medium">{document.joiningDate}</p>
            </div>
          ) : null}
          {document.visibility.showWorkLocation && document.workLocation ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">Work Location</p>
              <p className="font-medium">{document.workLocation}</p>
            </div>
          ) : null}
          {document.paymentMethod ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">Payment Method</p>
              <p className="font-medium">{document.paymentMethod}</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Attendance bar chart */}
      {document.visibility.showAttendance ? (
        <section className="document-break-inside-avoid">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
            Attendance
          </p>
          <div className="mt-3 flex h-6 w-full overflow-hidden rounded-full bg-[rgba(29,23,16,0.06)]">
            {paidDaysNum > 0 ? (
              <div
                className="flex items-center justify-center text-[0.6rem] font-semibold text-white"
                style={{
                  width: `${(paidDaysNum / totalAttendanceDays) * 100}%`,
                  backgroundColor: "var(--voucher-accent)",
                }}
              >
                {paidDaysNum > 2 ? `${paidDaysNum} paid` : ""}
              </div>
            ) : null}
            {leaveDaysNum > 0 ? (
              <div
                className="flex items-center justify-center text-[0.6rem] font-semibold text-white"
                style={{
                  width: `${(leaveDaysNum / totalAttendanceDays) * 100}%`,
                  backgroundColor: "rgba(29,23,16,0.35)",
                }}
              >
                {leaveDaysNum > 1 ? `${leaveDaysNum}` : ""}
              </div>
            ) : null}
            {lopDaysNum > 0 ? (
              <div
                className="flex items-center justify-center text-[0.6rem] font-semibold text-white"
                style={{
                  width: `${(lopDaysNum / totalAttendanceDays) * 100}%`,
                  backgroundColor: "rgba(180,60,60,0.7)",
                }}
              >
                {lopDaysNum > 1 ? `${lopDaysNum}` : ""}
              </div>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-[rgba(29,23,16,0.6)]">
            {document.workingDays ? <span>Working: {document.workingDays}</span> : null}
            {document.paidDays ? (
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--voucher-accent)" }}
                />
                Paid: {document.paidDays}
              </span>
            ) : null}
            {document.leaveDays ? (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[rgba(29,23,16,0.35)]" />
                Leave: {document.leaveDays}
              </span>
            ) : null}
            {document.lossOfPayDays ? (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[rgba(180,60,60,0.7)]" />
                LOP: {document.lossOfPayDays}
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Notes */}
      {document.visibility.showNotes && document.notes ? (
        <section className="document-break-inside-avoid rounded-lg border border-dashed border-[rgba(29,23,16,0.15)] bg-[rgba(255,255,255,0.88)] p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
            Notes
          </p>
          <p className="mt-2 text-sm leading-6 text-[rgba(29,23,16,0.8)]">
            {document.notes}
          </p>
        </section>
      ) : null}

      {/* Bank details + Signature footer */}
      <section
        className={cn(
          "document-break-inside-avoid grid gap-4",
          printLikeMode ? "grid-cols-2" : "md:grid-cols-2",
        )}
      >
        {document.visibility.showBankDetails && (document.bankName || document.bankAccountNumber) ? (
          <div className="rounded-lg border border-[rgba(29,23,16,0.1)] bg-[rgba(255,255,255,0.95)] p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
              Bank Details
            </p>
            <div className="mt-3 space-y-1.5 text-sm text-[rgba(29,23,16,0.75)]">
              {document.bankName ? <p>Bank: {document.bankName}</p> : null}
              {document.bankAccountNumber ? (
                <p>Account: {document.bankAccountNumber}</p>
              ) : null}
              {document.bankIfsc ? <p>IFSC: {document.bankIfsc}</p> : null}
            </div>
          </div>
        ) : null}

        {document.visibility.showSignature ? (
          <div className="rounded-lg border border-[rgba(29,23,16,0.1)] bg-[rgba(255,255,255,0.95)] p-4">
            <div className="mt-10 border-b border-[rgba(29,23,16,0.3)]" />
            <p className="mt-2 text-xs text-[rgba(29,23,16,0.6)]">
              {document.preparedBy
                ? `Prepared by: ${document.preparedBy}`
                : "Authorized Signatory"}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[rgba(29,23,16,0.4)] transition-colors hover:bg-red-50 hover:text-red-500"
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
      className="mt-3 inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[var(--voucher-accent)] transition-opacity hover:opacity-75"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
      {label}
    </button>
  );
}

function DetailedBreakdownEditor() {
  const { control } = useFormContext<SalarySlipFormValues>();
  const watchedValues = useWatch({ control }) as SalarySlipFormValues;
  const doc = normalizeSalarySlip(watchedValues);

  const { fields: earningFields, append: appendEarning, remove: removeEarning } = useFieldArray({ control, name: "earnings" });
  const { fields: deductionFields, append: appendDeduction, remove: removeDeduction } = useFieldArray({ control, name: "deductions" });

  return (
    <div className="space-y-6 text-[var(--voucher-ink)]">
      {/* Header */}
      <section className="document-break-inside-avoid flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <DocumentBrandMark branding={doc.branding} />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold">
              <InlineTextField name="branding.companyName" placeholder="Company name" />
            </div>
            <div className="mt-1 space-y-0.5 text-xs leading-5 text-[rgba(29,23,16,0.6)]">
              {doc.visibility.showAddress ? (
                <InlineTextArea name="branding.address" placeholder="Address" />
              ) : null}
              {doc.visibility.showEmail ? (
                <InlineTextField name="branding.email" placeholder="Email" />
              ) : null}
              {doc.visibility.showPhone ? (
                <InlineTextField name="branding.phone" placeholder="Phone" />
              ) : null}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[rgba(29,23,16,0.45)]">
            Pay Slip
          </p>
          <div className="mt-1 text-sm font-medium">
            <InlineTextField name="payPeriodLabel" placeholder="Pay period" className="text-right" />
          </div>
          <div className="mt-0.5 text-xs text-[rgba(29,23,16,0.55)]">
            <InlineTextField name="payDate" placeholder="Pay date" className="text-right" />
          </div>
        </div>
      </section>

      {/* Net salary hero */}
      <section className="document-break-inside-avoid py-4 text-center">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[rgba(29,23,16,0.45)]">
          Net Salary
        </p>
        <p className="mt-2 text-4xl font-bold">{doc.netSalaryFormatted}</p>
        <div
          className="mx-auto mt-2 h-[3px] w-24 rounded-full"
          style={{ backgroundColor: "var(--voucher-accent)" }}
        />
        <p className="mt-2 text-xs italic text-[rgba(29,23,16,0.55)]">
          {doc.netSalaryInWords}
        </p>
      </section>

      {/* Three-column summary strip */}
      <section className="document-break-inside-avoid grid gap-4 sm:grid-cols-3">
        {[
          { label: "Gross Earnings", value: doc.totalEarningsFormatted },
          { label: "Total Deductions", value: doc.totalDeductionsFormatted },
          { label: "Net Pay", value: doc.netSalaryFormatted },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border-2 px-4 py-3 text-center"
            style={{ borderColor: "var(--voucher-accent)" }}
          >
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.5)]">
              {label}
            </p>
            <p className="mt-1 text-lg font-bold">{value}</p>
          </div>
        ))}
      </section>

      {/* Earnings breakdown */}
      <section className="document-break-inside-avoid">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
          Earnings Breakdown
        </p>
        <div className="mt-3 divide-y divide-[rgba(29,23,16,0.07)]">
          {earningFields.map((field, index) => {
            const amount = Number(watchedValues.earnings?.[index]?.amount || 0);
            const percentage = doc.totalEarnings > 0 ? (amount / doc.totalEarnings) * 100 : 0;
            return (
              <div key={field.id} className="group relative py-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="relative z-10 min-w-0 flex-1">
                    <InlineTextField name={`earnings.${index}.label`} placeholder="Earning label" />
                  </div>
                  <div className="relative z-10 flex items-center gap-2">
                    <span className="text-xs text-[rgba(29,23,16,0.45)]">
                      {percentage.toFixed(1)}%
                    </span>
                    <InlineNumberField name={`earnings.${index}.amount`} placeholder="0" className="w-24 text-right font-medium" />
                    {earningFields.length > 1 ? (
                      <RemoveRowButton onClick={() => removeEarning(index)} />
                    ) : null}
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(29,23,16,0.06)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(percentage, 2)}%`,
                      backgroundColor: "var(--voucher-accent)",
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-[rgba(29,23,16,0.04)] px-4 py-2.5 text-sm">
          <p className="font-semibold text-[rgba(29,23,16,0.7)]">Total Earnings</p>
          <p className="font-bold">{doc.totalEarningsFormatted}</p>
        </div>
        <AddRowButton onClick={() => appendEarning({ label: "", amount: "" })} label="Add earning" />
      </section>

      {/* Deductions breakdown */}
      <section className="document-break-inside-avoid">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
          Deductions Breakdown
        </p>
        <div className="mt-3 divide-y divide-[rgba(29,23,16,0.07)]">
          {deductionFields.map((field, index) => {
            const amount = Number(watchedValues.deductions?.[index]?.amount || 0);
            const percentage = doc.totalDeductions > 0 ? (amount / doc.totalDeductions) * 100 : 0;
            return (
              <div key={field.id} className="group relative py-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="relative z-10 min-w-0 flex-1">
                    <InlineTextField name={`deductions.${index}.label`} placeholder="Deduction label" />
                  </div>
                  <div className="relative z-10 flex items-center gap-2">
                    <span className="text-xs text-[rgba(29,23,16,0.45)]">
                      {percentage.toFixed(1)}%
                    </span>
                    <InlineNumberField name={`deductions.${index}.amount`} placeholder="0" className="w-24 text-right font-medium" />
                    {deductionFields.length > 1 ? (
                      <RemoveRowButton onClick={() => removeDeduction(index)} />
                    ) : null}
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(29,23,16,0.06)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(percentage, 2)}%`,
                      backgroundColor: "rgba(29,23,16,0.25)",
                      opacity: 0.6,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-[rgba(29,23,16,0.04)] px-4 py-2.5 text-sm">
          <p className="font-semibold text-[rgba(29,23,16,0.7)]">Total Deductions</p>
          <p className="font-bold">{doc.totalDeductionsFormatted}</p>
        </div>
        <AddRowButton onClick={() => appendDeduction({ label: "", amount: "" })} label="Add deduction" />
      </section>

      {/* Employee profile */}
      <section className="document-break-inside-avoid rounded-lg border border-[rgba(29,23,16,0.1)] bg-[rgba(255,255,255,0.95)] p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
          Employee Details
        </p>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-3">
          <div>
            <p className="text-xs text-[rgba(29,23,16,0.45)]">Name</p>
            <InlineTextField name="employeeName" placeholder="Employee name" className="font-medium" />
          </div>
          {doc.visibility.showEmployeeId ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">Employee ID</p>
              <InlineTextField name="employeeId" placeholder="ID" className="font-medium" />
            </div>
          ) : null}
          {doc.visibility.showDepartment ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">Department</p>
              <InlineTextField name="department" placeholder="Department" className="font-medium" />
            </div>
          ) : null}
          {doc.visibility.showDesignation ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">Designation</p>
              <InlineTextField name="designation" placeholder="Designation" className="font-medium" />
            </div>
          ) : null}
          {doc.visibility.showPan ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">PAN</p>
              <InlineTextField name="pan" placeholder="PAN" className="font-medium" />
            </div>
          ) : null}
          {doc.visibility.showUan ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">UAN</p>
              <InlineTextField name="uan" placeholder="UAN" className="font-medium" />
            </div>
          ) : null}
          {doc.visibility.showJoiningDate ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">Joining Date</p>
              <InlineTextField name="joiningDate" placeholder="Date" className="font-medium" />
            </div>
          ) : null}
          {doc.visibility.showWorkLocation ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">Work Location</p>
              <InlineTextField name="workLocation" placeholder="Location" className="font-medium" />
            </div>
          ) : null}
          {doc.visibility.showBankDetails ? (
            <div>
              <p className="text-xs text-[rgba(29,23,16,0.45)]">Payment Method</p>
              <InlineTextField name="paymentMethod" placeholder="Method" className="font-medium" />
            </div>
          ) : null}
        </div>
      </section>

      {/* Attendance */}
      {doc.visibility.showAttendance ? (
        <section className="document-break-inside-avoid">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
            Attendance
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-[rgba(29,23,16,0.6)]">
            {doc.workingDays ? <span>Working: {doc.workingDays}</span> : null}
            {doc.paidDays ? <span>Paid: {doc.paidDays}</span> : null}
            {doc.leaveDays ? <span>Leave: {doc.leaveDays}</span> : null}
            {doc.lossOfPayDays ? <span>LOP: {doc.lossOfPayDays}</span> : null}
          </div>
        </section>
      ) : null}

      {/* Notes */}
      {doc.visibility.showNotes ? (
        <section className="document-break-inside-avoid rounded-lg border border-dashed border-[rgba(29,23,16,0.15)] bg-[rgba(255,255,255,0.88)] p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
            Notes
          </p>
          <InlineTextArea name="notes" placeholder="Add notes..." className="mt-2 text-sm leading-6 text-[rgba(29,23,16,0.8)]" />
        </section>
      ) : null}

      {/* Bank details + Signature footer */}
      <section className="document-break-inside-avoid grid gap-4 md:grid-cols-2">
        {doc.visibility.showBankDetails ? (
          <div className="rounded-lg border border-[rgba(29,23,16,0.1)] bg-[rgba(255,255,255,0.95)] p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
              Bank Details
            </p>
            <div className="mt-3 space-y-1.5 text-sm text-[rgba(29,23,16,0.75)]">
              <div className="flex items-center gap-1">
                <span className="shrink-0">Bank:</span>
                <InlineTextField name="bankName" placeholder="Bank name" />
              </div>
              <div className="flex items-center gap-1">
                <span className="shrink-0">Account:</span>
                <InlineTextField name="bankAccountNumber" placeholder="Account number" />
              </div>
              <div className="flex items-center gap-1">
                <span className="shrink-0">IFSC:</span>
                <InlineTextField name="bankIfsc" placeholder="IFSC code" />
              </div>
            </div>
          </div>
        ) : null}

        {doc.visibility.showSignature ? (
          <div className="rounded-lg border border-[rgba(29,23,16,0.1)] bg-[rgba(255,255,255,0.95)] p-4">
            <div className="mt-10 border-b border-[rgba(29,23,16,0.3)]" />
            <div className="mt-2 flex items-center gap-1 text-xs text-[rgba(29,23,16,0.6)]">
              <span className="shrink-0">Prepared by:</span>
              <InlineTextField name="preparedBy" placeholder="Name" />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
