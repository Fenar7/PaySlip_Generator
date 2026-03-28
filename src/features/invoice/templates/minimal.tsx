import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import { cn } from "@/lib/utils";
import type { InvoiceDocument } from "@/features/invoice/types";

function InvoiceTable({ document }: { document: InvoiceDocument }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[rgba(29,23,16,0.08)]">
      <table className="w-full border-collapse text-left text-[0.82rem]">
        <thead className="bg-[rgba(29,23,16,0.04)] text-[0.68rem] uppercase tracking-[0.2em] text-[rgba(29,23,16,0.52)]">
          <tr>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Qty</th>
            <th className="px-4 py-3">Unit</th>
            <th className="px-4 py-3">Discount</th>
            <th className="px-4 py-3">Tax</th>
            <th className="px-4 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {document.lineItems.map((item) => (
            <tr key={`${item.description}-${item.lineTotal}`} className="border-t border-[rgba(29,23,16,0.07)] align-top">
              <td className="px-4 py-4 text-[rgba(29,23,16,0.84)]">{item.description}</td>
              <td className="px-4 py-4">{item.quantity}</td>
              <td className="px-4 py-4">{item.unitPriceFormatted}</td>
              <td className="px-4 py-4">{item.discountAmountFormatted}</td>
              <td className="px-4 py-4">{item.taxAmountFormatted}</td>
              <td className="px-4 py-4 text-right font-medium">{item.lineTotalFormatted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MinimalInvoiceTemplate({
  document,
  mode = "preview",
}: {
  document: InvoiceDocument;
  mode?: "preview" | "print" | "pdf" | "png";
}) {
  const printLike = mode !== "preview";

  return (
    <div className="space-y-6 text-[var(--voucher-ink)]">
      <section className="flex items-start justify-between gap-6 border-b border-[rgba(29,23,16,0.08)] pb-6">
        <div className="flex items-start gap-4">
          <DocumentBrandMark branding={document.branding} />
          <div className="space-y-4">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[rgba(29,23,16,0.45)]">
                {document.title}
              </p>
              <h2 className="mt-3 text-[1.95rem] leading-tight">
                {document.branding.companyName}
              </h2>
            </div>
            <div className="space-y-1.5 text-sm leading-6 text-[rgba(29,23,16,0.7)]">
              {document.visibility.showAddress && document.branding.address ? (
                <p>{document.branding.address}</p>
              ) : null}
              {document.visibility.showEmail && document.branding.email ? (
                <p>{document.branding.email}</p>
              ) : null}
              {document.visibility.showPhone && document.branding.phone ? (
                <p>{document.branding.phone}</p>
              ) : null}
              {document.website ? <p>{document.website}</p> : null}
              {document.businessTaxId ? <p>{document.businessTaxId}</p> : null}
            </div>
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.88)] px-5 py-4 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
            Invoice no.
          </p>
          <p className="mt-2 text-xl font-medium">{document.invoiceNumber}</p>
          <p className="mt-4 text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
            Invoice date
          </p>
          <p className="mt-2 text-sm font-medium">{document.invoiceDate}</p>
          {document.dueDate ? (
            <>
              <p className="mt-4 text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                Due date
              </p>
              <p className="mt-2 text-sm font-medium">{document.dueDate}</p>
            </>
          ) : null}
        </div>
      </section>

      <section
        className={cn(
          "grid gap-4",
          printLike ? "grid-cols-[1.1fr_0.9fr]" : "md:grid-cols-[1.1fr_0.9fr]",
        )}
      >
        <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.86)] p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
            Bill to
          </p>
          <p className="mt-3 text-base font-medium">{document.clientName}</p>
          <div className="mt-3 space-y-1.5 text-sm leading-6 text-[rgba(29,23,16,0.7)]">
            {document.clientAddress ? <p>{document.clientAddress}</p> : null}
            {document.clientEmail ? <p>{document.clientEmail}</p> : null}
            {document.clientPhone ? <p>{document.clientPhone}</p> : null}
            {document.clientTaxId ? <p>Tax ID: {document.clientTaxId}</p> : null}
          </div>
        </div>
        <div className="rounded-[1.5rem] p-5 text-white" style={{ backgroundColor: "var(--voucher-accent)" }}>
          <p className="text-[0.68rem] uppercase tracking-[0.25em] text-white/72">
            Balance due
          </p>
          <p className="mt-3 text-3xl font-medium">{document.balanceDueFormatted}</p>
          <p className="mt-4 text-sm leading-7 text-white/82">{document.amountInWords}</p>
        </div>
      </section>

      {document.shippingAddress || document.placeOfSupply ? (
        <section
          className={cn(
            "grid gap-4",
            printLike ? "grid-cols-2" : "md:grid-cols-2",
          )}
        >
          {document.shippingAddress ? (
            <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.86)] p-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                Ship to
              </p>
              <p className="mt-3 text-sm leading-7 text-[rgba(29,23,16,0.82)]">
                {document.shippingAddress}
              </p>
            </div>
          ) : null}
          {document.placeOfSupply ? (
            <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.86)] p-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                Place of supply
              </p>
              <p className="mt-3 text-sm font-medium text-[rgba(29,23,16,0.82)]">
                {document.placeOfSupply}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <InvoiceTable document={document} />

      <section
        className={cn(
          "grid gap-4",
          printLike ? "grid-cols-[1fr_18rem]" : "md:grid-cols-[1fr_18rem]",
        )}
      >
        <div className="space-y-4">
          {document.notes ? (
            <div className="rounded-[1.5rem] border border-dashed border-[rgba(29,23,16,0.12)] bg-[rgba(255,255,255,0.72)] p-5">
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                Notes
              </p>
              <p className="mt-3 text-sm leading-7 text-[rgba(29,23,16,0.82)]">{document.notes}</p>
            </div>
          ) : null}
          {document.terms ? (
            <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.84)] p-5">
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                Terms
              </p>
              <p className="mt-3 text-sm leading-7 text-[rgba(29,23,16,0.82)]">{document.terms}</p>
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.92)] p-5">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{document.subtotalFormatted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <span>{document.totalDiscountFormatted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tax</span>
              <span>{document.totalTaxFormatted}</span>
            </div>
            {document.extraCharges > 0 ? (
              <div className="flex items-center justify-between">
                <span>Extra charges</span>
                <span>{document.extraChargesFormatted}</span>
              </div>
            ) : null}
            {document.invoiceLevelDiscount > 0 ? (
              <div className="flex items-center justify-between">
                <span>Invoice discount</span>
                <span>{document.invoiceLevelDiscountFormatted}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-[rgba(29,23,16,0.08)] pt-3 font-medium">
              <span>Total</span>
              <span>{document.grandTotalFormatted}</span>
            </div>
            {document.visibility.showPaymentSummary ? (
              <>
                <div className="flex items-center justify-between">
                  <span>Paid</span>
                  <span>{document.amountPaidFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-base font-medium text-[var(--voucher-accent)]">
                  <span>Due</span>
                  <span>{document.balanceDueFormatted}</span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
