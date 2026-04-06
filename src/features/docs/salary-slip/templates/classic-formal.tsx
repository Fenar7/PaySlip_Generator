import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import { cn } from "@/lib/utils";
import type { SalarySlipDocument } from "@/features/docs/salary-slip/types";

type SalarySlipTemplateProps = {
  document: SalarySlipDocument;
  mode?: "preview" | "print" | "pdf" | "png";
};

export function ClassicFormalSalarySlipTemplate({
  document,
  mode = "preview",
}: SalarySlipTemplateProps) {
  const printLikeMode = mode !== "preview";

  const employeeFields: [string, string | undefined, boolean][] = [
    ["Employee Name", document.employeeName, true],
    ["Employee ID", document.employeeId, document.visibility.showEmployeeId],
    ["Department", document.department, document.visibility.showDepartment],
    ["Designation", document.designation, document.visibility.showDesignation],
    ["PAN", document.pan, document.visibility.showPan],
    ["UAN", document.uan, document.visibility.showUan],
    ["Pay Period", document.payPeriodLabel, true],
    ["Pay Date", document.payDate, true],
    ["Joining Date", document.joiningDate, document.visibility.showJoiningDate],
    ["Work Location", document.workLocation, document.visibility.showWorkLocation],
  ];

  const visibleFields = employeeFields.filter(([, value, visible]) => value && visible);

  const maxRows = Math.max(document.earnings.length, document.deductions.length);

  return (
    <div className="space-y-0 text-[var(--voucher-ink)]">
      {/* Outer bordered container */}
      <div className="border border-[rgba(29,23,16,0.3)]">
        {/* Top accent banner */}
        <div
          className="document-break-inside-avoid px-6 py-4 text-center text-white"
          style={{ backgroundColor: "var(--voucher-accent)" }}
        >
          <div className="flex items-center justify-center gap-3">
            <DocumentBrandMark branding={document.branding} />
            <h1 className="text-xl font-bold uppercase tracking-wide">
              {document.branding.companyName || "Slipwise"}
            </h1>
          </div>
          <div className="mt-1 space-y-0.5 text-xs text-white/80">
            {document.visibility.showAddress && document.branding.address ? (
              <p>{document.branding.address}</p>
            ) : null}
            <p className="flex items-center justify-center gap-3">
              {document.visibility.showEmail && document.branding.email ? (
                <span>{document.branding.email}</span>
              ) : null}
              {document.visibility.showPhone && document.branding.phone ? (
                <span>{document.branding.phone}</span>
              ) : null}
            </p>
          </div>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em]">
            Salary Slip
          </p>
        </div>

        {/* Employee details table grid */}
        <div className="document-break-inside-avoid">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {Array.from({ length: Math.ceil(visibleFields.length / 2) }).map((_, rowIdx) => {
                const left = visibleFields[rowIdx * 2];
                const right = visibleFields[rowIdx * 2 + 1];
                return (
                  <tr key={rowIdx}>
                    {left ? (
                      <>
                        <td className="w-[18%] border border-[rgba(29,23,16,0.2)] bg-[rgba(29,23,16,0.04)] px-3 py-2 font-semibold text-[rgba(29,23,16,0.65)]">
                          {left[0]}
                        </td>
                        <td className="w-[32%] border border-[rgba(29,23,16,0.2)] px-3 py-2">
                          {left[1]}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="w-[18%] border border-[rgba(29,23,16,0.2)]" />
                        <td className="w-[32%] border border-[rgba(29,23,16,0.2)]" />
                      </>
                    )}
                    {right ? (
                      <>
                        <td className="w-[18%] border border-[rgba(29,23,16,0.2)] bg-[rgba(29,23,16,0.04)] px-3 py-2 font-semibold text-[rgba(29,23,16,0.65)]">
                          {right[0]}
                        </td>
                        <td className="w-[32%] border border-[rgba(29,23,16,0.2)] px-3 py-2">
                          {right[1]}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="w-[18%] border border-[rgba(29,23,16,0.2)]" />
                        <td className="w-[32%] border border-[rgba(29,23,16,0.2)]" />
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Earnings & Deductions side-by-side table */}
        <div className="document-break-inside-avoid">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  className="border border-[rgba(29,23,16,0.2)] px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-[rgba(29,23,16,0.6)]"
                  style={{ borderRightWidth: "2px", borderRightColor: "rgba(29,23,16,0.35)" }}
                  colSpan={2}
                >
                  Earnings
                </th>
                <th
                  className="border border-[rgba(29,23,16,0.2)] px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-[rgba(29,23,16,0.6)]"
                  colSpan={2}
                >
                  Deductions
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }).map((_, i) => {
                const earn = document.earnings[i];
                const ded = document.deductions[i];
                return (
                  <tr key={i}>
                    <td className="w-[25%] border border-[rgba(29,23,16,0.2)] px-3 py-2 text-[rgba(29,23,16,0.82)]">
                      {earn?.label ?? ""}
                    </td>
                    <td
                      className="w-[25%] border border-[rgba(29,23,16,0.2)] px-3 py-2 text-right font-medium"
                      style={{ borderRightWidth: "2px", borderRightColor: "rgba(29,23,16,0.35)" }}
                    >
                      {earn?.amountFormatted ?? ""}
                    </td>
                    <td className="w-[25%] border border-[rgba(29,23,16,0.2)] px-3 py-2 text-[rgba(29,23,16,0.82)]">
                      {ded?.label ?? ""}
                    </td>
                    <td className="w-[25%] border border-[rgba(29,23,16,0.2)] px-3 py-2 text-right font-medium">
                      {ded?.amountFormatted ?? ""}
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="bg-[rgba(29,23,16,0.05)]">
                <td className="border border-[rgba(29,23,16,0.2)] px-3 py-2.5 font-semibold text-[rgba(29,23,16,0.7)]">
                  Total Earnings
                </td>
                <td
                  className="border border-[rgba(29,23,16,0.2)] px-3 py-2.5 text-right font-bold"
                  style={{ borderRightWidth: "2px", borderRightColor: "rgba(29,23,16,0.35)" }}
                >
                  {document.totalEarningsFormatted}
                </td>
                <td className="border border-[rgba(29,23,16,0.2)] px-3 py-2.5 font-semibold text-[rgba(29,23,16,0.7)]">
                  Total Deductions
                </td>
                <td className="border border-[rgba(29,23,16,0.2)] px-3 py-2.5 text-right font-bold">
                  {document.totalDeductionsFormatted}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Net salary row */}
        <div
          className="document-break-inside-avoid border-t border-[rgba(29,23,16,0.2)] text-white"
          style={{ backgroundColor: "var(--voucher-accent)" }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-bold uppercase tracking-wide">Net Salary</p>
            <p className="text-xl font-bold">{document.netSalaryFormatted}</p>
          </div>
          <p className="border-t border-white/20 px-4 py-2 text-xs text-white/80">
            {document.netSalaryInWords}
          </p>
        </div>

        {/* Attendance row */}
        {document.visibility.showAttendance ? (
          <div className="document-break-inside-avoid">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th
                    className="border border-[rgba(29,23,16,0.2)] bg-[rgba(29,23,16,0.04)] px-3 py-2 text-left font-semibold uppercase tracking-wider text-[rgba(29,23,16,0.6)]"
                    colSpan={4}
                  >
                    Attendance
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[
                    ["Working Days", document.workingDays],
                    ["Paid Days", document.paidDays],
                    ["Leave Days", document.leaveDays],
                    ["Loss of Pay", document.lossOfPayDays],
                  ].map(([label, value]) => (
                    <td
                      key={label}
                      className="w-1/4 border border-[rgba(29,23,16,0.2)] px-3 py-2 text-center"
                    >
                      <span className="text-xs text-[rgba(29,23,16,0.55)]">{label}</span>
                      <br />
                      <span className="font-semibold">{value || "—"}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Bank details row */}
        {document.visibility.showBankDetails && (document.bankName || document.bankAccountNumber) ? (
          <div className="document-break-inside-avoid">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th
                    className="border border-[rgba(29,23,16,0.2)] bg-[rgba(29,23,16,0.04)] px-3 py-2 text-left font-semibold uppercase tracking-wider text-[rgba(29,23,16,0.6)]"
                    colSpan={4}
                  >
                    Bank Details
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {document.bankName ? (
                    <td className="border border-[rgba(29,23,16,0.2)] px-3 py-2">
                      <span className="text-xs text-[rgba(29,23,16,0.55)]">Bank</span>
                      <br />
                      {document.bankName}
                    </td>
                  ) : null}
                  {document.bankAccountNumber ? (
                    <td className="border border-[rgba(29,23,16,0.2)] px-3 py-2">
                      <span className="text-xs text-[rgba(29,23,16,0.55)]">Account No.</span>
                      <br />
                      {document.bankAccountNumber}
                    </td>
                  ) : null}
                  {document.bankIfsc ? (
                    <td className="border border-[rgba(29,23,16,0.2)] px-3 py-2">
                      <span className="text-xs text-[rgba(29,23,16,0.55)]">IFSC</span>
                      <br />
                      {document.bankIfsc}
                    </td>
                  ) : null}
                  {document.paymentMethod ? (
                    <td className="border border-[rgba(29,23,16,0.2)] px-3 py-2">
                      <span className="text-xs text-[rgba(29,23,16,0.55)]">Payment Method</span>
                      <br />
                      {document.paymentMethod}
                    </td>
                  ) : null}
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Notes */}
        {document.visibility.showNotes && document.notes ? (
          <div className="document-break-inside-avoid border-t border-[rgba(29,23,16,0.2)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgba(29,23,16,0.55)]">
              Notes
            </p>
            <p className="mt-1 text-sm leading-6 text-[rgba(29,23,16,0.8)]">{document.notes}</p>
          </div>
        ) : null}

        {/* Signature section */}
        {document.visibility.showSignature ? (
          <div
            className={cn(
              "document-break-inside-avoid border-t border-[rgba(29,23,16,0.2)]",
              printLikeMode ? "grid grid-cols-2" : "grid md:grid-cols-2",
            )}
          >
            <div className="border-r border-[rgba(29,23,16,0.2)] px-6 py-5">
              <div className="mt-8 border-b border-[rgba(29,23,16,0.4)]" />
              <p className="mt-2 text-xs text-[rgba(29,23,16,0.6)]">
                {document.preparedBy
                  ? `Prepared by: ${document.preparedBy}`
                  : "Authorized Signatory"}
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="mt-8 border-b border-[rgba(29,23,16,0.4)]" />
              <p className="mt-2 text-xs text-[rgba(29,23,16,0.6)]">
                Employee Signature
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
