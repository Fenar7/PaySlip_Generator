import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import { cn } from "@/lib/utils";
import type { SalarySlipDocument } from "@/features/docs/salary-slip/types";

type SalarySlipTemplateProps = {
  document: SalarySlipDocument;
  mode?: "preview" | "print" | "pdf" | "png";
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
