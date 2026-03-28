import { cn } from "@/lib/utils";
import type { InvoiceDocument } from "@/features/invoice/types";

function SummaryRow({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 text-sm ${emphasized ? "font-medium text-[var(--voucher-ink)]" : "text-[rgba(29,23,16,0.72)]"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function ProfessionalInvoiceTemplate({
  document,
  mode = "preview",
}: {
  document: InvoiceDocument;
  mode?: "preview" | "print" | "pdf" | "png";
}) {
  const printLike = mode !== "preview";

  return (
    <div className="space-y-6 text-[var(--voucher-ink)]">
      <section className="rounded-[1.75rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.92)]">
        <div
          className={cn(
            "grid gap-5 border-b border-[rgba(29,23,16,0.08)] p-6",
            printLike ? "grid-cols-[1.2fr_0.8fr]" : "md:grid-cols-[1.2fr_0.8fr]",
          )}
        >
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.32em] text-[rgba(29,23,16,0.45)]">
              {document.title}
            </p>
            <h2 className="mt-3 text-[2rem] leading-tight">{document.branding.companyName}</h2>
            <div className="mt-4 space-y-1.5 text-sm leading-6 text-[rgba(29,23,16,0.72)]">
              {document.visibility.showAddress && document.branding.address ? <p>{document.branding.address}</p> : null}
              {document.visibility.showEmail && document.branding.email ? <p>{document.branding.email}</p> : null}
              {document.visibility.showPhone && document.branding.phone ? <p>{document.branding.phone}</p> : null}
              {document.businessTaxId ? <p>{document.businessTaxId}</p> : null}
            </div>
          </div>
          <div className="rounded-[1.4rem] bg-[rgba(29,23,16,0.04)] p-5">
            <div className="grid gap-3 text-sm">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Invoice no.</p>
                <p className="mt-2 font-medium">{document.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Invoice date</p>
                <p className="mt-2 font-medium">{document.invoiceDate}</p>
              </div>
              {document.dueDate ? (
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Due date</p>
                  <p className="mt-2 font-medium">{document.dueDate}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "grid gap-4 p-6",
            printLike ? "grid-cols-[1fr_18rem]" : "md:grid-cols-[1fr_18rem]",
          )}
        >
          <div className="rounded-[1.4rem] border border-[rgba(29,23,16,0.08)] bg-white p-5">
            <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Client details</p>
            <p className="mt-3 text-base font-medium">{document.clientName}</p>
            <div className="mt-3 space-y-1.5 text-sm leading-6 text-[rgba(29,23,16,0.72)]">
              {document.clientAddress ? <p>{document.clientAddress}</p> : null}
              {document.clientEmail ? <p>{document.clientEmail}</p> : null}
              {document.clientPhone ? <p>{document.clientPhone}</p> : null}
            </div>
          </div>
          <div className="rounded-[1.4rem] p-5 text-white" style={{ backgroundColor: "var(--voucher-accent)" }}>
            <p className="text-[0.68rem] uppercase tracking-[0.25em] text-white/72">Grand total</p>
            <p className="mt-3 text-3xl font-medium">{document.grandTotalFormatted}</p>
            <p className="mt-4 text-sm leading-7 text-white/82">{document.amountInWords}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.6rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.92)]">
        <table className="w-full border-collapse text-left text-[0.82rem]">
          <thead className="bg-[rgba(29,23,16,0.04)] text-[0.68rem] uppercase tracking-[0.2em] text-[rgba(29,23,16,0.52)]">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Base</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Tax</th>
              <th className="px-4 py-3 text-right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {document.lineItems.map((item) => (
              <tr key={`${item.description}-${item.lineTotal}`} className="border-t border-[rgba(29,23,16,0.08)] align-top">
                <td className="px-4 py-4 text-[rgba(29,23,16,0.84)]">{item.description}</td>
                <td className="px-4 py-4">{item.quantity}</td>
                <td className="px-4 py-4">{item.baseAmountFormatted}</td>
                <td className="px-4 py-4">{item.discountAmountFormatted}</td>
                <td className="px-4 py-4">{item.taxAmountFormatted}</td>
                <td className="px-4 py-4 text-right font-medium">{item.lineTotalFormatted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section
        className={cn(
          "grid gap-4",
          printLike ? "grid-cols-[1fr_18rem]" : "md:grid-cols-[1fr_18rem]",
        )}
      >
        <div className="space-y-4">
          {document.notes ? (
            <div className="rounded-[1.4rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.88)] p-5">
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Notes</p>
              <p className="mt-3 text-sm leading-7 text-[rgba(29,23,16,0.82)]">{document.notes}</p>
            </div>
          ) : null}
          {document.terms ? (
            <div className="rounded-[1.4rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.88)] p-5">
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Terms</p>
              <p className="mt-3 text-sm leading-7 text-[rgba(29,23,16,0.82)]">{document.terms}</p>
            </div>
          ) : null}
          {document.bankName || document.bankAccountNumber || document.bankIfsc ? (
            <div className="rounded-[1.4rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.88)] p-5">
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Bank details</p>
              <div className="mt-3 space-y-1.5 text-sm leading-6 text-[rgba(29,23,16,0.82)]">
                {document.bankName ? <p>{document.bankName}</p> : null}
                {document.bankAccountNumber ? <p>A/c: {document.bankAccountNumber}</p> : null}
                {document.bankIfsc ? <p>IFSC: {document.bankIfsc}</p> : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className="rounded-[1.4rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.96)] p-5">
          <SummaryRow label="Subtotal" value={document.subtotalFormatted} />
          <SummaryRow label="Discount" value={document.totalDiscountFormatted} />
          <SummaryRow label="Tax" value={document.totalTaxFormatted} />
          <div className="border-t border-[rgba(29,23,16,0.08)] pt-2">
            <SummaryRow label="Grand total" value={document.grandTotalFormatted} emphasized />
          </div>
          <SummaryRow label="Amount paid" value={document.amountPaidFormatted} />
          <div className="border-t border-[rgba(29,23,16,0.08)] pt-2">
            <SummaryRow label="Balance due" value={document.balanceDueFormatted} emphasized />
          </div>
          {document.authorizedBy ? (
            <div className="mt-6 border-t border-dashed border-[rgba(29,23,16,0.16)] pt-4 text-sm">
              Authorized by: {document.authorizedBy}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
