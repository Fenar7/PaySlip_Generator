import { cn } from "@/lib/utils";
import type { SalarySlipDocument } from "@/features/salary-slip/types";

type SalarySlipTemplateProps = {
  document: SalarySlipDocument;
  mode?: "preview" | "print" | "pdf" | "png";
};

function MoneyTable({
  title,
  rows,
  totalLabel,
  totalValue,
}: {
  title: string;
  rows: SalarySlipDocument["earnings"];
  totalLabel: string;
  totalValue: string;
}) {
  return (
    <section className="rounded-[1.35rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.94)] p-5">
      <div className="flex items-center justify-between gap-4 border-b border-[rgba(29,23,16,0.08)] pb-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
          {title}
        </p>
        <p className="text-sm font-medium text-[rgba(29,23,16,0.7)]">{rows.length} items</p>
      </div>
      <div className="divide-y divide-[rgba(29,23,16,0.08)]">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm">
            <p className="text-[rgba(29,23,16,0.82)]">{row.label}</p>
            <p className="font-medium text-[var(--voucher-ink)]">{row.amountFormatted}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-4 rounded-[1rem] bg-[rgba(29,23,16,0.04)] px-4 py-3 text-sm">
        <p className="font-medium text-[rgba(29,23,16,0.7)]">{totalLabel}</p>
        <p className="font-semibold text-[var(--voucher-ink)]">{totalValue}</p>
      </div>
    </section>
  );
}

export function CorporateCleanSalarySlipTemplate({
  document,
  mode = "preview",
}: SalarySlipTemplateProps) {
  const printLikeMode = mode !== "preview";

  return (
    <div className="space-y-6 text-[var(--voucher-ink)]">
      <section className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.96)] p-6">
        <div className="flex items-start justify-between gap-6 border-b border-[rgba(29,23,16,0.08)] pb-5">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[rgba(29,23,16,0.45)]">
              Monthly payroll summary
            </p>
            <h2 className="mt-3 text-[1.8rem] font-medium">
              {document.branding.companyName || "Business Document Generator"}
            </h2>
            <div className="mt-4 space-y-1.5 text-sm leading-6 text-[rgba(29,23,16,0.68)]">
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
          <div className="rounded-[1.25rem] px-5 py-4 text-white" style={{ backgroundColor: "var(--voucher-accent)" }}>
            <p className="text-[0.68rem] uppercase tracking-[0.25em] text-white/72">Net salary</p>
            <p className="mt-3 text-3xl font-medium">{document.netSalaryFormatted}</p>
            <p className="mt-2 max-w-[13rem] text-xs leading-6 text-white/82">
              {document.netSalaryInWords}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mt-5 grid gap-4",
            printLikeMode ? "grid-cols-2" : "md:grid-cols-2",
          )}
        >
          <div className="rounded-[1.2rem] bg-[rgba(29,23,16,0.04)] p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Employee</p>
            <p className="mt-2 text-lg font-medium">{document.employeeName}</p>
            <div className="mt-3 space-y-1.5 text-sm text-[rgba(29,23,16,0.72)]">
              {document.employeeId ? <p>Employee ID: {document.employeeId}</p> : null}
              {document.department ? <p>Department: {document.department}</p> : null}
              {document.designation ? <p>Designation: {document.designation}</p> : null}
            </div>
          </div>
          <div className="rounded-[1.2rem] bg-[rgba(29,23,16,0.04)] p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Period</p>
            <p className="mt-2 text-lg font-medium">{document.payPeriodLabel}</p>
            <div className="mt-3 space-y-1.5 text-sm text-[rgba(29,23,16,0.72)]">
              {document.payDate ? <p>Pay date: {document.payDate}</p> : null}
              {document.paymentMethod ? <p>Payment method: {document.paymentMethod}</p> : null}
            </div>
          </div>
        </div>
      </section>

      {document.visibility.showAttendance ? (
        <section
          className={cn(
            "grid gap-4",
            printLikeMode ? "grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4",
          )}
        >
          {[
            ["Working days", document.workingDays],
            ["Paid days", document.paidDays],
            ["Leave days", document.leaveDays],
            ["Loss of pay", document.lossOfPayDays],
          ].map(([label, value]) =>
            value ? (
              <div
                key={label}
                className="rounded-[1.2rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.92)] p-4"
              >
                <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                  {label}
                </p>
                <p className="mt-3 text-2xl font-medium">{value}</p>
              </div>
            ) : null,
          )}
        </section>
      ) : null}

      <section
        className={cn(
          "grid gap-4",
          printLikeMode ? "grid-cols-2" : "md:grid-cols-2",
        )}
      >
        <MoneyTable
          title="Earnings"
          rows={document.earnings}
          totalLabel="Total earnings"
          totalValue={document.totalEarningsFormatted}
        />
        <MoneyTable
          title="Deductions"
          rows={document.deductions}
          totalLabel="Total deductions"
          totalValue={document.totalDeductionsFormatted}
        />
      </section>

      {document.visibility.showBankDetails && (document.bankName || document.bankAccountNumber) ? (
        <section className="rounded-[1.35rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.92)] p-5">
          <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
            Disbursement details
          </p>
          <div
            className={cn(
              "mt-4 grid gap-4 text-sm text-[rgba(29,23,16,0.78)]",
              printLikeMode ? "grid-cols-2" : "sm:grid-cols-2",
            )}
          >
            {document.bankName ? <p>Bank: {document.bankName}</p> : null}
            {document.bankAccountNumber ? (
              <p>Account: {document.bankAccountNumber}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {document.notes ? (
        <section className="rounded-[1.35rem] border border-dashed border-[rgba(29,23,16,0.14)] bg-[rgba(255,255,255,0.82)] p-5">
          <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Notes</p>
          <p className="mt-3 text-sm leading-7 text-[rgba(29,23,16,0.8)]">{document.notes}</p>
        </section>
      ) : null}

      {document.visibility.showSignature ? (
        <section
          className={cn(
            "grid gap-4",
            printLikeMode ? "grid-cols-2" : "md:grid-cols-2",
          )}
        >
          <div className="rounded-[1.35rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.92)] p-5">
            <div className="h-16 border-b border-dashed border-[rgba(29,23,16,0.16)]" />
            <p className="mt-4 text-sm font-medium text-[rgba(29,23,16,0.8)]">
              {document.preparedBy ? `Prepared by: ${document.preparedBy}` : "Prepared by"}
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.92)] p-5">
            <div className="h-16 border-b border-dashed border-[rgba(29,23,16,0.16)]" />
            <p className="mt-4 text-sm font-medium text-[rgba(29,23,16,0.8)]">Employee acknowledgement</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
