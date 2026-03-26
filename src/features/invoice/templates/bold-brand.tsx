import type { InvoiceDocument } from "@/features/invoice/types";

export function BoldBrandInvoiceTemplate({
  document,
}: {
  document: InvoiceDocument;
}) {
  return (
    <div className="space-y-6 text-[var(--voucher-ink)]">
      <section
        className="rounded-[1.8rem] p-6 text-white"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--voucher-accent) 94%, white 6%), #7f5a22)",
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.32em] text-white/70">
              {document.title}
            </p>
            <h2 className="mt-3 text-[2.05rem] leading-tight">{document.branding.companyName}</h2>
            <div className="mt-4 space-y-1.5 text-sm leading-6 text-white/84">
              {document.visibility.showAddress && document.branding.address ? <p>{document.branding.address}</p> : null}
              {document.visibility.showEmail && document.branding.email ? <p>{document.branding.email}</p> : null}
              {document.visibility.showPhone && document.branding.phone ? <p>{document.branding.phone}</p> : null}
            </div>
          </div>
          <div className="min-w-[14rem] rounded-[1.4rem] bg-white/12 p-5">
            <p className="text-[0.68rem] uppercase tracking-[0.25em] text-white/70">Invoice no.</p>
            <p className="mt-2 text-xl font-medium">{document.invoiceNumber}</p>
            <p className="mt-4 text-[0.68rem] uppercase tracking-[0.25em] text-white/70">Due</p>
            <p className="mt-2 text-sm font-medium">{document.dueDate || document.invoiceDate}</p>
            <p className="mt-5 text-[0.68rem] uppercase tracking-[0.25em] text-white/70">Balance due</p>
            <p className="mt-2 text-2xl font-medium">{document.balanceDueFormatted}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.92)] p-5">
          <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Bill to</p>
          <p className="mt-3 text-lg font-medium">{document.clientName}</p>
          <div className="mt-3 space-y-1.5 text-sm leading-6 text-[rgba(29,23,16,0.72)]">
            {document.clientAddress ? <p>{document.clientAddress}</p> : null}
            {document.clientEmail ? <p>{document.clientEmail}</p> : null}
            {document.clientPhone ? <p>{document.clientPhone}</p> : null}
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.92)] p-5">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Invoice date</p>
              <p className="mt-2 font-medium">{document.invoiceDate}</p>
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">GST / Tax ID</p>
              <p className="mt-2 font-medium">{document.businessTaxId || "Not shown"}</p>
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Grand total</p>
              <p className="mt-2 font-medium">{document.grandTotalFormatted}</p>
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Paid</p>
              <p className="mt-2 font-medium">{document.amountPaidFormatted}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.6rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.96)]">
        <table className="w-full border-collapse text-left text-[0.82rem]">
          <thead style={{ backgroundColor: "color-mix(in srgb, var(--voucher-accent) 16%, white 84%)" }}>
            <tr className="text-[0.68rem] uppercase tracking-[0.2em] text-[rgba(29,23,16,0.58)]">
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Tax %</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {document.lineItems.map((item) => (
              <tr key={`${item.description}-${item.lineTotal}`} className="border-t border-[rgba(29,23,16,0.08)]">
                <td className="px-4 py-4 text-[rgba(29,23,16,0.84)]">{item.description}</td>
                <td className="px-4 py-4">{item.quantity}</td>
                <td className="px-4 py-4">{item.unitPriceFormatted}</td>
                <td className="px-4 py-4">{item.taxRate}%</td>
                <td className="px-4 py-4">{item.discountAmountFormatted}</td>
                <td className="px-4 py-4 text-right font-medium">{item.lineTotalFormatted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          {document.notes ? (
            <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.9)] p-5">
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Notes</p>
              <p className="mt-3 text-sm leading-7 text-[rgba(29,23,16,0.82)]">{document.notes}</p>
            </div>
          ) : null}
          {document.terms ? (
            <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.9)] p-5">
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Terms</p>
              <p className="mt-3 text-sm leading-7 text-[rgba(29,23,16,0.82)]">{document.terms}</p>
            </div>
          ) : null}
          {document.bankName || document.bankAccountNumber || document.bankIfsc ? (
            <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.9)] p-5">
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">Remit to</p>
              <div className="mt-3 space-y-1.5 text-sm leading-6 text-[rgba(29,23,16,0.82)]">
                {document.bankName ? <p>{document.bankName}</p> : null}
                {document.bankAccountNumber ? <p>A/c: {document.bankAccountNumber}</p> : null}
                {document.bankIfsc ? <p>IFSC: {document.bankIfsc}</p> : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.98)] p-5">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span>Subtotal</span><span>{document.subtotalFormatted}</span></div>
            <div className="flex items-center justify-between"><span>Discount</span><span>{document.totalDiscountFormatted}</span></div>
            <div className="flex items-center justify-between"><span>Tax</span><span>{document.totalTaxFormatted}</span></div>
            <div className="flex items-center justify-between border-t border-[rgba(29,23,16,0.08)] pt-3 font-medium"><span>Grand total</span><span>{document.grandTotalFormatted}</span></div>
            <div className="flex items-center justify-between"><span>Paid</span><span>{document.amountPaidFormatted}</span></div>
            <div className="flex items-center justify-between text-base font-medium text-[var(--voucher-accent)]"><span>Due</span><span>{document.balanceDueFormatted}</span></div>
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
