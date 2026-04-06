import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import type { SalarySlipDocument } from "@/features/docs/salary-slip/types";

type SalarySlipTemplateProps = {
  document: SalarySlipDocument;
  mode?: "preview" | "print" | "pdf" | "png";
};

export function CompactPayslipSalarySlipTemplate({
  document,
  mode = "preview",
}: SalarySlipTemplateProps) {
  const _printLikeMode = mode !== "preview";

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
