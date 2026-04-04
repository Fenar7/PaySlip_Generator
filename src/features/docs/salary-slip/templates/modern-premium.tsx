import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import { cn } from "@/lib/utils";
import type { SalarySlipDocument } from "@/features/docs/salary-slip/types";

type SalarySlipTemplateProps = {
  document: SalarySlipDocument;
  mode?: "preview" | "print" | "pdf" | "png";
};

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="document-break-inside-avoid rounded-[1.25rem] border px-4 py-4"
      style={
        accent
          ? {
              backgroundColor: "var(--voucher-accent)",
              borderColor: "transparent",
              color: "white",
            }
          : undefined
      }
    >
      <p
        className={
          accent
            ? "text-[0.68rem] uppercase tracking-[0.24em] text-white/72"
            : "text-[0.68rem] uppercase tracking-[0.24em] text-[rgba(29,23,16,0.45)]"
        }
      >
        {label}
      </p>
      <p className="mt-3 text-2xl font-medium">{value}</p>
    </div>
  );
}

export function ModernPremiumSalarySlipTemplate({
  document,
  mode = "preview",
}: SalarySlipTemplateProps) {
  const printLikeMode = mode !== "preview";

  return (
    <div className="space-y-6 text-[var(--voucher-ink)]">
      <section className="document-break-inside-avoid rounded-[1.6rem] border border-[rgba(29,23,16,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,241,232,0.96))] p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <DocumentBrandMark branding={document.branding} />
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.32em] text-[rgba(29,23,16,0.45)]">
                Salary Slip
              </p>
              <h2 className="mt-3 text-[2rem] font-medium">{document.employeeName}</h2>
              <p className="mt-3 text-sm leading-7 text-[rgba(29,23,16,0.7)]">
                {document.payPeriodLabel}
                {document.payDate ? ` · Paid on ${document.payDate}` : ""}
              </p>
            </div>
          </div>
          <div className="max-w-[15rem] text-right text-sm leading-7 text-[rgba(29,23,16,0.72)]">
            <p className="font-medium text-[var(--voucher-ink)]">
              {document.branding.companyName || "Slipwise"}
            </p>
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

        <div
          className={cn(
            "mt-6 grid gap-4",
            printLikeMode
              ? "grid-cols-[1.15fr_0.85fr]"
              : "md:grid-cols-[1.15fr_0.85fr]",
          )}
        >
          <div className="rounded-[1.35rem] border border-[rgba(29,23,16,0.08)] bg-white/88 p-5">
            <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
              Employee profile
            </p>
            <div
              className={cn(
                "mt-4 grid gap-3 text-sm text-[rgba(29,23,16,0.78)]",
                printLikeMode ? "grid-cols-2" : "sm:grid-cols-2",
              )}
            >
              {document.employeeId ? <p>Employee ID: {document.employeeId}</p> : null}
              {document.department ? <p>Department: {document.department}</p> : null}
              {document.designation ? <p>Designation: {document.designation}</p> : null}
              {document.workLocation ? <p>Location: {document.workLocation}</p> : null}
              {document.joiningDate ? <p>Joined: {document.joiningDate}</p> : null}
              {document.pan ? <p>PAN: {document.pan}</p> : null}
              {document.uan ? <p>UAN: {document.uan}</p> : null}
              {document.paymentMethod ? <p>Mode: {document.paymentMethod}</p> : null}
              {document.bankName ? <p>Bank: {document.bankName}</p> : null}
              {document.bankAccountNumber ? (
                <p>Account: {document.bankAccountNumber}</p>
              ) : null}
              {document.bankIfsc ? <p>IFSC: {document.bankIfsc}</p> : null}
            </div>
          </div>
          <div className="grid gap-3">
            <SummaryCard label="Earnings" value={document.totalEarningsFormatted} />
            <SummaryCard label="Deductions" value={document.totalDeductionsFormatted} />
            <SummaryCard label="Net salary" value={document.netSalaryFormatted} accent />
          </div>
        </div>
      </section>

      <section
        className={cn(
          "grid gap-4",
          printLikeMode
            ? "grid-cols-[1.05fr_0.95fr]"
            : "lg:grid-cols-[1.05fr_0.95fr]",
        )}
      >
        <div className="document-break-inside-avoid rounded-[1.35rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.95)] p-5">
          <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
            Earnings and deductions
          </p>
          <div
            className={cn(
              "mt-4 grid gap-4",
              printLikeMode ? "grid-cols-2" : "sm:grid-cols-2",
            )}
          >
            <div>
              <p className="text-sm font-medium text-[rgba(29,23,16,0.72)]">Earnings</p>
              <div className="mt-3 divide-y divide-[rgba(29,23,16,0.08)]">
                {document.earnings.map((row) => (
                  <div key={`earn-${row.label}`} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm">
                    <p>{row.label}</p>
                    <p className="font-medium">{row.amountFormatted}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[rgba(29,23,16,0.72)]">Deductions</p>
              <div className="mt-3 divide-y divide-[rgba(29,23,16,0.08)]">
                {document.deductions.map((row) => (
                  <div key={`ded-${row.label}`} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm">
                    <p>{row.label}</p>
                    <p className="font-medium">{row.amountFormatted}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="document-break-inside-avoid rounded-[1.35rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.95)] p-5">
            <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
              Net salary in words
            </p>
            <p className="mt-4 text-lg leading-8 text-[rgba(29,23,16,0.84)]">
              {document.netSalaryInWords}
            </p>
          </div>

          {document.visibility.showAttendance ? (
            <div className="document-break-inside-avoid rounded-[1.35rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.95)] p-5">
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                Attendance summary
              </p>
              <div
                className={cn(
                  "mt-4 grid gap-3 text-sm text-[rgba(29,23,16,0.78)]",
                  printLikeMode ? "grid-cols-2" : "sm:grid-cols-2",
                )}
              >
                {document.workingDays ? <p>Working days: {document.workingDays}</p> : null}
                {document.paidDays ? <p>Paid days: {document.paidDays}</p> : null}
                {document.leaveDays ? <p>Leave days: {document.leaveDays}</p> : null}
                {document.lossOfPayDays ? <p>Loss of pay: {document.lossOfPayDays}</p> : null}
              </div>
            </div>
          ) : null}

          {document.notes ? (
            <div className="document-break-inside-avoid rounded-[1.35rem] border border-dashed border-[rgba(29,23,16,0.14)] bg-[rgba(255,255,255,0.88)] p-5">
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                Notes
              </p>
              <p className="mt-3 text-sm leading-7 text-[rgba(29,23,16,0.8)]">{document.notes}</p>
            </div>
          ) : null}
        </div>
      </section>

      {document.visibility.showSignature ? (
        <section
          className={cn(
            "document-break-inside-avoid grid gap-4",
            printLikeMode ? "grid-cols-2" : "md:grid-cols-2",
          )}
        >
          <div className="document-break-inside-avoid rounded-[1.35rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.95)] p-5">
            <div className="h-16 border-b border-dashed border-[rgba(29,23,16,0.16)]" />
            <p className="mt-4 text-sm font-medium">
              {document.preparedBy ? `Prepared by: ${document.preparedBy}` : "Prepared by"}
            </p>
          </div>
          <div className="document-break-inside-avoid rounded-[1.35rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.95)] p-5">
            <div className="h-16 border-b border-dashed border-[rgba(29,23,16,0.16)]" />
            <p className="mt-4 text-sm font-medium">Employee acknowledgement</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
