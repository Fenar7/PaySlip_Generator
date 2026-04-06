"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import {
  InlineNumberField,
  InlineTextArea,
  InlineTextField,
} from "@/components/document/inline-edit-fields";
import type { SalarySlipDocument, SalarySlipFormValues } from "@/features/docs/salary-slip/types";
import { normalizeSalarySlip } from "@/features/docs/salary-slip/utils/normalize-salary-slip";

type SalarySlipTemplateProps = {
  document: SalarySlipDocument;
  mode?: "preview" | "print" | "pdf" | "png" | "edit";
};

export function CompactPayslipSalarySlipTemplate({
  document,
  mode = "preview",
}: SalarySlipTemplateProps) {
  if (mode === "edit") {
    return <CompactPayslipEditor />;
  }

  // Build compact employee info line
  const infoParts: string[] = [document.employeeName];
  if (document.visibility.showEmployeeId && document.employeeId) {
    infoParts.push(document.employeeId);
  }
  if (document.visibility.showDepartment && document.department) {
    infoParts.push(document.department);
  }
  if (document.visibility.showDesignation && document.designation) {
    infoParts.push(document.designation);
  }

  const secondaryParts: string[] = [];
  if (document.visibility.showPan && document.pan) {
    secondaryParts.push(`PAN: ${document.pan}`);
  }
  if (document.visibility.showUan && document.uan) {
    secondaryParts.push(`UAN: ${document.uan}`);
  }
  if (document.visibility.showJoiningDate && document.joiningDate) {
    secondaryParts.push(`Joined: ${document.joiningDate}`);
  }
  if (document.visibility.showWorkLocation && document.workLocation) {
    secondaryParts.push(document.workLocation);
  }

  return (
    <div className="text-[var(--voucher-ink)]">
      {/* Single card container with accent top border */}
      <div
        className="border border-[rgba(29,23,16,0.12)] bg-white"
        style={{ borderTopWidth: "4px", borderTopColor: "var(--voucher-accent)" }}
      >
        {/* Header row: logo, company name, period */}
        <div className="document-break-inside-avoid flex items-center justify-between border-b border-[rgba(29,23,16,0.1)] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <DocumentBrandMark branding={document.branding} />
            <div>
              <p className="text-sm font-bold">
                {document.branding.companyName || "Slipwise"}
              </p>
              <div className="flex flex-wrap gap-x-2 text-[0.65rem] text-[rgba(29,23,16,0.5)]">
                {document.visibility.showAddress && document.branding.address ? (
                  <span>{document.branding.address}</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p
              className="text-[0.6rem] font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--voucher-accent)" }}
            >
              Pay Slip
            </p>
            <p className="text-xs font-medium">{document.payPeriodLabel}</p>
            {document.payDate ? (
              <p className="text-[0.65rem] text-[rgba(29,23,16,0.5)]">
                {document.payDate}
              </p>
            ) : null}
          </div>
        </div>

        {/* Employee info: single compact line */}
        <div className="document-break-inside-avoid border-b border-[rgba(29,23,16,0.1)] px-5 py-2.5">
          <p className="text-sm font-medium">{infoParts.join(" | ")}</p>
          {secondaryParts.length > 0 ? (
            <p className="mt-0.5 text-[0.7rem] text-[rgba(29,23,16,0.55)]">
              {secondaryParts.join(" · ")}
            </p>
          ) : null}
        </div>

        {/* Earnings rows */}
        <div className="document-break-inside-avoid px-5 pt-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.4)]">
            Earnings
          </p>
          <div className="mt-1">
            {document.earnings.map((row) => (
              <div
                key={`e-${row.label}`}
                className="flex items-center justify-between border-b border-dotted border-[rgba(29,23,16,0.12)] py-1.5 text-sm"
              >
                <span className="text-[rgba(29,23,16,0.78)]">{row.label}</span>
                <span className="font-medium">{row.amountFormatted}</span>
              </div>
            ))}
            {/* Earnings subtotal */}
            <div className="flex items-center justify-between border-b border-[rgba(29,23,16,0.15)] py-2 text-sm">
              <span className="font-semibold text-[rgba(29,23,16,0.6)]">
                Total Earnings
              </span>
              <span className="font-bold">{document.totalEarningsFormatted}</span>
            </div>
          </div>
        </div>

        {/* Deductions rows */}
        <div className="document-break-inside-avoid px-5 pt-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.4)]">
            Deductions
          </p>
          <div className="mt-1">
            {document.deductions.map((row) => (
              <div
                key={`d-${row.label}`}
                className="flex items-center justify-between border-b border-dotted border-[rgba(29,23,16,0.12)] py-1.5 text-sm"
              >
                <span className="text-[rgba(29,23,16,0.78)]">{row.label}</span>
                <span className="font-medium">{row.amountFormatted}</span>
              </div>
            ))}
            {/* Deductions subtotal */}
            <div className="flex items-center justify-between border-b border-[rgba(29,23,16,0.15)] py-2 text-sm">
              <span className="font-semibold text-[rgba(29,23,16,0.6)]">
                Total Deductions
              </span>
              <span className="font-bold">{document.totalDeductionsFormatted}</span>
            </div>
          </div>
        </div>

        {/* NET SALARY — prominent row */}
        <div className="document-break-inside-avoid mx-5 mt-3 border-t-2 border-[rgba(29,23,16,0.3)]">
          <div className="flex items-center justify-between py-3">
            <span
              className="text-sm font-bold uppercase tracking-wide"
              style={{ color: "var(--voucher-accent)" }}
            >
              Net Salary
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: "var(--voucher-accent)" }}
            >
              {document.netSalaryFormatted}
            </span>
          </div>
          <p className="pb-2 text-[0.7rem] italic text-[rgba(29,23,16,0.5)]">
            {document.netSalaryInWords}
          </p>
        </div>

        {/* Attendance — compact inline */}
        {document.visibility.showAttendance ? (
          <div className="document-break-inside-avoid border-t border-[rgba(29,23,16,0.1)] px-5 py-2.5">
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[rgba(29,23,16,0.65)]">
              {document.workingDays ? (
                <span>Working: <strong>{document.workingDays}</strong></span>
              ) : null}
              {document.paidDays ? (
                <span>Paid: <strong>{document.paidDays}</strong></span>
              ) : null}
              {document.leaveDays ? (
                <span>Leave: <strong>{document.leaveDays}</strong></span>
              ) : null}
              {document.lossOfPayDays ? (
                <span>LOP: <strong>{document.lossOfPayDays}</strong></span>
              ) : null}
            </p>
          </div>
        ) : null}

        {/* Bank details — single compact line */}
        {document.visibility.showBankDetails &&
        (document.bankName || document.bankAccountNumber) ? (
          <div className="document-break-inside-avoid border-t border-[rgba(29,23,16,0.1)] px-5 py-2.5">
            <p className="flex flex-wrap gap-x-3 text-xs text-[rgba(29,23,16,0.6)]">
              {document.paymentMethod ? (
                <span>{document.paymentMethod}</span>
              ) : null}
              {document.bankName ? <span>Bank: {document.bankName}</span> : null}
              {document.bankAccountNumber ? (
                <span>A/C: {document.bankAccountNumber}</span>
              ) : null}
              {document.bankIfsc ? <span>IFSC: {document.bankIfsc}</span> : null}
            </p>
          </div>
        ) : null}

        {/* Notes */}
        {document.visibility.showNotes && document.notes ? (
          <div className="document-break-inside-avoid border-t border-dashed border-[rgba(29,23,16,0.1)] px-5 py-2.5">
            <p className="text-xs leading-5 text-[rgba(29,23,16,0.65)]">
              <strong>Note:</strong> {document.notes}
            </p>
          </div>
        ) : null}

        {/* Footer line — no separate signature cards */}
        {document.visibility.showSignature ? (
          <div className="document-break-inside-avoid border-t border-[rgba(29,23,16,0.1)] px-5 py-3">
            <p className="text-[0.65rem] text-[rgba(29,23,16,0.45)]">
              {document.preparedBy
                ? `Prepared by: ${document.preparedBy}`
                : "Prepared by: HR Department"}{" "}
              | This is a system-generated document
            </p>
          </div>
        ) : null}
      </div>
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
      className="mt-2 inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[var(--voucher-accent)] transition-opacity hover:opacity-75"
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

function CompactPayslipEditor() {
  const { control } = useFormContext<SalarySlipFormValues>();
  const watchedValues = useWatch({ control }) as SalarySlipFormValues;
  const doc = normalizeSalarySlip(watchedValues);

  const { fields: earningFields, append: appendEarning, remove: removeEarning } = useFieldArray({ control, name: "earnings" });
  const { fields: deductionFields, append: appendDeduction, remove: removeDeduction } = useFieldArray({ control, name: "deductions" });

  return (
    <div className="text-[var(--voucher-ink)]">
      <div
        className="border border-[rgba(29,23,16,0.12)] bg-white"
        style={{ borderTopWidth: "4px", borderTopColor: "var(--voucher-accent)" }}
      >
        {/* Header row */}
        <div className="document-break-inside-avoid flex items-center justify-between border-b border-[rgba(29,23,16,0.1)] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <DocumentBrandMark branding={doc.branding} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">
                <InlineTextField name="branding.companyName" placeholder="Company name" />
              </div>
              {doc.visibility.showAddress ? (
                <div className="flex flex-wrap gap-x-2 text-[0.65rem] text-[rgba(29,23,16,0.5)]">
                  <InlineTextField name="branding.address" placeholder="Address" />
                </div>
              ) : null}
            </div>
          </div>
          <div className="text-right">
            <p
              className="text-[0.6rem] font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--voucher-accent)" }}
            >
              Pay Slip
            </p>
            <div className="text-xs font-medium">
              <InlineTextField name="payPeriodLabel" placeholder="Pay period" className="text-right" />
            </div>
            <div className="text-[0.65rem] text-[rgba(29,23,16,0.5)]">
              <InlineTextField name="payDate" placeholder="Date" className="text-right" />
            </div>
          </div>
        </div>

        {/* Employee info */}
        <div className="document-break-inside-avoid border-b border-[rgba(29,23,16,0.1)] px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
            <InlineTextField name="employeeName" placeholder="Employee name" className="shrink-0" />
            {doc.visibility.showEmployeeId ? (
              <>
                <span className="shrink-0 text-[rgba(29,23,16,0.3)]">|</span>
                <InlineTextField name="employeeId" placeholder="ID" className="shrink-0" />
              </>
            ) : null}
            {doc.visibility.showDepartment ? (
              <>
                <span className="shrink-0 text-[rgba(29,23,16,0.3)]">|</span>
                <InlineTextField name="department" placeholder="Department" className="shrink-0" />
              </>
            ) : null}
            {doc.visibility.showDesignation ? (
              <>
                <span className="shrink-0 text-[rgba(29,23,16,0.3)]">|</span>
                <InlineTextField name="designation" placeholder="Designation" className="shrink-0" />
              </>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[0.7rem] text-[rgba(29,23,16,0.55)]">
            {doc.visibility.showPan ? (
              <div className="flex items-center gap-1">
                <span className="shrink-0">PAN:</span>
                <InlineTextField name="pan" placeholder="PAN" />
              </div>
            ) : null}
            {doc.visibility.showUan ? (
              <div className="flex items-center gap-1">
                <span className="shrink-0">UAN:</span>
                <InlineTextField name="uan" placeholder="UAN" />
              </div>
            ) : null}
            {doc.visibility.showJoiningDate ? (
              <div className="flex items-center gap-1">
                <span className="shrink-0">Joined:</span>
                <InlineTextField name="joiningDate" placeholder="Date" />
              </div>
            ) : null}
            {doc.visibility.showWorkLocation ? (
              <InlineTextField name="workLocation" placeholder="Location" />
            ) : null}
          </div>
        </div>

        {/* Earnings rows */}
        <div className="document-break-inside-avoid px-5 pt-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.4)]">
            Earnings
          </p>
          <div className="mt-1">
            {earningFields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center justify-between border-b border-dotted border-[rgba(29,23,16,0.12)] py-1.5 text-sm"
              >
                <InlineTextField name={`earnings.${index}.label`} placeholder="Earning label" className="text-[rgba(29,23,16,0.78)]" />
                <div className="flex items-center gap-1">
                  <InlineNumberField name={`earnings.${index}.amount`} placeholder="0" className="w-24 text-right font-medium" />
                  {earningFields.length > 1 ? (
                    <RemoveRowButton onClick={() => removeEarning(index)} />
                  ) : null}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-b border-[rgba(29,23,16,0.15)] py-2 text-sm">
              <span className="font-semibold text-[rgba(29,23,16,0.6)]">Total Earnings</span>
              <span className="font-bold">{doc.totalEarningsFormatted}</span>
            </div>
            <AddRowButton onClick={() => appendEarning({ label: "", amount: "" })} label="Add earning" />
          </div>
        </div>

        {/* Deductions rows */}
        <div className="document-break-inside-avoid px-5 pt-3">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.4)]">
            Deductions
          </p>
          <div className="mt-1">
            {deductionFields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center justify-between border-b border-dotted border-[rgba(29,23,16,0.12)] py-1.5 text-sm"
              >
                <InlineTextField name={`deductions.${index}.label`} placeholder="Deduction label" className="text-[rgba(29,23,16,0.78)]" />
                <div className="flex items-center gap-1">
                  <InlineNumberField name={`deductions.${index}.amount`} placeholder="0" className="w-24 text-right font-medium" />
                  {deductionFields.length > 1 ? (
                    <RemoveRowButton onClick={() => removeDeduction(index)} />
                  ) : null}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-b border-[rgba(29,23,16,0.15)] py-2 text-sm">
              <span className="font-semibold text-[rgba(29,23,16,0.6)]">Total Deductions</span>
              <span className="font-bold">{doc.totalDeductionsFormatted}</span>
            </div>
            <AddRowButton onClick={() => appendDeduction({ label: "", amount: "" })} label="Add deduction" />
          </div>
        </div>

        {/* Net salary */}
        <div className="document-break-inside-avoid mx-5 mt-3 border-t-2 border-[rgba(29,23,16,0.3)]">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--voucher-accent)" }}>
              Net Salary
            </span>
            <span className="text-xl font-bold" style={{ color: "var(--voucher-accent)" }}>
              {doc.netSalaryFormatted}
            </span>
          </div>
          <p className="pb-2 text-[0.7rem] italic text-[rgba(29,23,16,0.5)]">
            {doc.netSalaryInWords}
          </p>
        </div>

        {/* Attendance */}
        {doc.visibility.showAttendance ? (
          <div className="document-break-inside-avoid border-t border-[rgba(29,23,16,0.1)] px-5 py-2.5">
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[rgba(29,23,16,0.65)]">
              {doc.workingDays ? <span>Working: <strong>{doc.workingDays}</strong></span> : null}
              {doc.paidDays ? <span>Paid: <strong>{doc.paidDays}</strong></span> : null}
              {doc.leaveDays ? <span>Leave: <strong>{doc.leaveDays}</strong></span> : null}
              {doc.lossOfPayDays ? <span>LOP: <strong>{doc.lossOfPayDays}</strong></span> : null}
            </p>
          </div>
        ) : null}

        {/* Bank details */}
        {doc.visibility.showBankDetails ? (
          <div className="document-break-inside-avoid border-t border-[rgba(29,23,16,0.1)] px-5 py-2.5">
            <div className="flex flex-wrap gap-x-3 text-xs text-[rgba(29,23,16,0.6)]">
              <div className="flex items-center gap-1">
                <span className="shrink-0">Method:</span>
                <InlineTextField name="paymentMethod" placeholder="Payment method" />
              </div>
              <div className="flex items-center gap-1">
                <span className="shrink-0">Bank:</span>
                <InlineTextField name="bankName" placeholder="Bank name" />
              </div>
              <div className="flex items-center gap-1">
                <span className="shrink-0">A/C:</span>
                <InlineTextField name="bankAccountNumber" placeholder="Account number" />
              </div>
              <div className="flex items-center gap-1">
                <span className="shrink-0">IFSC:</span>
                <InlineTextField name="bankIfsc" placeholder="IFSC code" />
              </div>
            </div>
          </div>
        ) : null}

        {/* Notes */}
        {doc.visibility.showNotes ? (
          <div className="document-break-inside-avoid border-t border-dashed border-[rgba(29,23,16,0.1)] px-5 py-2.5">
            <div className="text-xs leading-5 text-[rgba(29,23,16,0.65)]">
              <strong>Note:</strong>{" "}
              <InlineTextArea name="notes" placeholder="Add notes..." className="text-xs" />
            </div>
          </div>
        ) : null}

        {/* Footer */}
        {doc.visibility.showSignature ? (
          <div className="document-break-inside-avoid border-t border-[rgba(29,23,16,0.1)] px-5 py-3">
            <div className="flex items-center gap-1 text-[0.65rem] text-[rgba(29,23,16,0.45)]">
              <span className="shrink-0">Prepared by:</span>
              <InlineTextField name="preparedBy" placeholder="HR Department" className="text-[0.65rem]" />
              <span className="shrink-0">| This is a system-generated document</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
