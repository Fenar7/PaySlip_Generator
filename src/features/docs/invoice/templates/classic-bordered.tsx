import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import { cn } from "@/lib/utils";
import type { InvoiceDocument } from "@/features/docs/invoice/types";

export function ClassicBorderedInvoiceTemplate({
  document,
  mode = "preview",
}: {
  document: InvoiceDocument;
  mode?: "preview" | "print" | "pdf" | "png";
}) {
  const printLike = mode !== "preview";

  const showBank =
    document.visibility.showBankDetails &&
    (document.bankName || document.bankAccountNumber || document.bankIfsc);

  return (
    <div className="space-y-0 text-[var(--voucher-ink)]">
      {/* ── Header ── */}
      <section className="document-break-inside-avoid border-b-2 border-[var(--voucher-ink)] pb-4">
        <div
          className={cn(
            "flex gap-6",
            printLike ? "flex-row items-start" : "flex-col md:flex-row md:items-start",
          )}
        >
          <div className="flex flex-1 items-start gap-3">
            <DocumentBrandMark
              branding={document.branding}
              className="flex h-14 w-14 shrink-0 items-center justify-center border border-[rgba(29,23,16,0.2)] bg-[rgba(29,23,16,0.04)] p-1.5"
              initialsClassName="text-sm font-bold text-[var(--voucher-ink)]"
              imageClassName="h-full w-full object-cover"
            />
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wide">
                {document.branding.companyName}
              </h2>
              <div className="mt-1 space-y-0.5 text-[0.78rem] leading-5 text-[rgba(29,23,16,0.7)]">
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
                {document.businessTaxId ? (
                  <p className="font-medium">GSTIN: {document.businessTaxId}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.5)]">
              {document.title}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{document.invoiceNumber}</p>
          </div>
        </div>
      </section>

      {/* ── Two-column: From/Bill To + Invoice Details ── */}
      <section
        className={cn(
          "document-break-inside-avoid grid border-b border-[rgba(29,23,16,0.15)] py-5",
          printLike ? "grid-cols-[1.15fr_0.85fr] gap-6" : "gap-4 md:grid-cols-[1.15fr_0.85fr] md:gap-6",
        )}
      >
        <div className="space-y-4">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[rgba(29,23,16,0.5)]">
              From
            </p>
            <p className="mt-1.5 text-sm font-semibold">{document.branding.companyName}</p>
            <div className="mt-1 text-[0.78rem] leading-5 text-[rgba(29,23,16,0.7)]">
              {document.visibility.showAddress && document.branding.address ? (
                <p>{document.branding.address}</p>
              ) : null}
            </div>
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[rgba(29,23,16,0.5)]">
              Bill To
            </p>
            <p className="mt-1.5 text-sm font-semibold">{document.clientName}</p>
            <div className="mt-1 space-y-0.5 text-[0.78rem] leading-5 text-[rgba(29,23,16,0.7)]">
              {document.clientAddress ? <p>{document.clientAddress}</p> : null}
              {document.clientEmail ? <p>{document.clientEmail}</p> : null}
              {document.clientPhone ? <p>{document.clientPhone}</p> : null}
              {document.clientTaxId ? <p>Tax ID: {document.clientTaxId}</p> : null}
            </div>
          </div>
        </div>

        {/* Invoice details grid */}
        <div className="border border-[rgba(29,23,16,0.2)]">
          <div className="flex border-b border-[rgba(29,23,16,0.2)]">
            <span className="w-[45%] border-r border-[rgba(29,23,16,0.2)] bg-[rgba(29,23,16,0.04)] px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[rgba(29,23,16,0.55)]">
              Invoice Date
            </span>
            <span className="flex-1 px-3 py-2 text-sm font-medium">{document.invoiceDate}</span>
          </div>
          {document.dueDate ? (
            <div className="flex border-b border-[rgba(29,23,16,0.2)]">
              <span className="w-[45%] border-r border-[rgba(29,23,16,0.2)] bg-[rgba(29,23,16,0.04)] px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[rgba(29,23,16,0.55)]">
                Due Date
              </span>
              <span className="flex-1 px-3 py-2 text-sm font-medium">{document.dueDate}</span>
            </div>
          ) : null}
          {document.placeOfSupply ? (
            <div className="flex border-b border-[rgba(29,23,16,0.2)]">
              <span className="w-[45%] border-r border-[rgba(29,23,16,0.2)] bg-[rgba(29,23,16,0.04)] px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[rgba(29,23,16,0.55)]">
                Place of Supply
              </span>
              <span className="flex-1 px-3 py-2 text-sm font-medium">{document.placeOfSupply}</span>
            </div>
          ) : null}
          <div className="flex border-b border-[rgba(29,23,16,0.2)]">
            <span className="w-[45%] border-r border-[rgba(29,23,16,0.2)] bg-[rgba(29,23,16,0.04)] px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[rgba(29,23,16,0.55)]">
              Grand Total
            </span>
            <span className="flex-1 px-3 py-2 text-sm font-bold">{document.grandTotalFormatted}</span>
          </div>
          <div className="flex">
            <span className="w-[45%] border-r border-[rgba(29,23,16,0.2)] px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--voucher-accent)]">
              Balance Due
            </span>
            <span className="flex-1 px-3 py-2 text-sm font-bold text-[var(--voucher-accent)]">
              {document.balanceDueFormatted}
            </span>
          </div>
        </div>
      </section>

      {/* ── Shipping / Place of Supply (if any) ── */}
      {document.shippingAddress ? (
        <section className="document-break-inside-avoid border-b border-[rgba(29,23,16,0.15)] py-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[rgba(29,23,16,0.5)]">
            Ship To
          </p>
          <p className="mt-1.5 text-sm leading-6 text-[rgba(29,23,16,0.78)]">
            {document.shippingAddress}
          </p>
        </section>
      ) : null}

      {/* ── Line Items — tight bordered table ── */}
      <section className="py-5">
        <table className="w-full text-left text-[0.78rem]" style={{ borderCollapse: "collapse" }}>
          <thead className="document-table-head">
            <tr className="border border-[rgba(29,23,16,0.3)] bg-[rgba(29,23,16,0.06)] text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[rgba(29,23,16,0.6)]">
              <th className="border-r border-[rgba(29,23,16,0.15)] px-3 py-2.5">#</th>
              <th className="border-r border-[rgba(29,23,16,0.15)] px-3 py-2.5">Description</th>
              <th className="border-r border-[rgba(29,23,16,0.15)] px-3 py-2.5 text-center">Qty</th>
              <th className="border-r border-[rgba(29,23,16,0.15)] px-3 py-2.5 text-right">Rate</th>
              <th className="border-r border-[rgba(29,23,16,0.15)] px-3 py-2.5 text-right">Discount</th>
              <th className="border-r border-[rgba(29,23,16,0.15)] px-3 py-2.5 text-right">Tax</th>
              <th className="px-3 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {document.lineItems.map((item, idx) => (
              <tr
                key={`${item.description}-${item.lineTotal}`}
                className={cn(
                  "document-table-row-avoid border border-[rgba(29,23,16,0.15)] align-top",
                  idx % 2 === 1 ? "bg-[rgba(29,23,16,0.025)]" : "",
                )}
              >
                <td className="border-r border-[rgba(29,23,16,0.15)] px-3 py-2 text-center text-[rgba(29,23,16,0.45)]">
                  {idx + 1}
                </td>
                <td className="border-r border-[rgba(29,23,16,0.15)] px-3 py-2 text-[rgba(29,23,16,0.85)]">
                  {item.description}
                </td>
                <td className="border-r border-[rgba(29,23,16,0.15)] px-3 py-2 text-center">
                  {item.quantity}
                </td>
                <td className="border-r border-[rgba(29,23,16,0.15)] px-3 py-2 text-right">
                  {item.unitPriceFormatted}
                </td>
                <td className="border-r border-[rgba(29,23,16,0.15)] px-3 py-2 text-right">
                  {item.discountAmountFormatted}
                </td>
                <td className="border-r border-[rgba(29,23,16,0.15)] px-3 py-2 text-right">
                  {item.taxAmountFormatted}
                </td>
                <td className="px-3 py-2 text-right font-medium">{item.lineTotalFormatted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Summary — right-aligned bordered box ── */}
      <section
        className={cn(
          "document-break-inside-avoid grid gap-5",
          printLike ? "grid-cols-[1fr_16rem]" : "md:grid-cols-[1fr_16rem]",
        )}
      >
        <div>
          <p className="text-sm italic leading-6 text-[rgba(29,23,16,0.65)]">
            {document.amountInWords}
          </p>
        </div>

        <div className="border border-[rgba(29,23,16,0.2)]">
          <div className="flex justify-between border-b border-[rgba(29,23,16,0.12)] px-3 py-1.5 text-sm">
            <span className="text-[rgba(29,23,16,0.65)]">Subtotal</span>
            <span>{document.subtotalFormatted}</span>
          </div>
          <div className="flex justify-between border-b border-[rgba(29,23,16,0.12)] px-3 py-1.5 text-sm">
            <span className="text-[rgba(29,23,16,0.65)]">Discount</span>
            <span>{document.totalDiscountFormatted}</span>
          </div>
          <div className="flex justify-between border-b border-[rgba(29,23,16,0.12)] px-3 py-1.5 text-sm">
            <span className="text-[rgba(29,23,16,0.65)]">Tax</span>
            <span>{document.totalTaxFormatted}</span>
          </div>
          {document.extraCharges > 0 ? (
            <div className="flex justify-between border-b border-[rgba(29,23,16,0.12)] px-3 py-1.5 text-sm">
              <span className="text-[rgba(29,23,16,0.65)]">Extra Charges</span>
              <span>{document.extraChargesFormatted}</span>
            </div>
          ) : null}
          {document.invoiceLevelDiscount > 0 ? (
            <div className="flex justify-between border-b border-[rgba(29,23,16,0.12)] px-3 py-1.5 text-sm">
              <span className="text-[rgba(29,23,16,0.65)]">Invoice Discount</span>
              <span>{document.invoiceLevelDiscountFormatted}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-b border-[rgba(29,23,16,0.2)] bg-[rgba(29,23,16,0.05)] px-3 py-2 text-sm font-bold">
            <span>Grand Total</span>
            <span>{document.grandTotalFormatted}</span>
          </div>
          {document.visibility.showPaymentSummary ? (
            <>
              <div className="flex justify-between border-b border-[rgba(29,23,16,0.12)] px-3 py-1.5 text-sm">
                <span className="text-[rgba(29,23,16,0.65)]">Paid</span>
                <span>{document.amountPaidFormatted}</span>
              </div>
              <div className="flex justify-between bg-[var(--voucher-accent)] px-3 py-2 text-sm font-bold text-white">
                <span>Balance Due</span>
                <span>{document.balanceDueFormatted}</span>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* ── Notes & Terms ── */}
      {document.notes || document.terms ? (
        <section className="document-break-inside-avoid space-y-3 border-t border-[rgba(29,23,16,0.15)] pt-4">
          {document.notes ? (
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[rgba(29,23,16,0.5)]">
                Notes
              </p>
              <p className="mt-1 text-sm leading-6 text-[rgba(29,23,16,0.75)]">{document.notes}</p>
            </div>
          ) : null}
          {document.terms ? (
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[rgba(29,23,16,0.5)]">
                Terms &amp; Conditions
              </p>
              <p className="mt-1 text-sm leading-6 text-[rgba(29,23,16,0.75)]">{document.terms}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Footer: Bank details left, Signature right ── */}
      {showBank || (document.visibility.showSignature && document.authorizedBy) ? (
        <section
          className={cn(
            "document-break-inside-avoid grid border-t-2 border-[var(--voucher-ink)] pt-4",
            printLike ? "grid-cols-2 gap-6" : "gap-4 md:grid-cols-2 md:gap-6",
          )}
        >
          {showBank ? (
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[rgba(29,23,16,0.5)]">
                Bank Details
              </p>
              <div className="mt-2 space-y-1 text-sm leading-5 text-[rgba(29,23,16,0.78)]">
                {document.bankName ? <p>Bank: {document.bankName}</p> : null}
                {document.bankAccountNumber ? <p>A/C No: {document.bankAccountNumber}</p> : null}
                {document.bankIfsc ? <p>IFSC: {document.bankIfsc}</p> : null}
              </div>
            </div>
          ) : (
            <div />
          )}

          {document.visibility.showSignature && document.authorizedBy ? (
            <div className="text-right">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[rgba(29,23,16,0.5)]">
                Authorized Signatory
              </p>
              <div className="mt-8 inline-block border-t border-[rgba(29,23,16,0.3)] px-6 pt-2">
                <p className="text-sm font-medium">{document.authorizedBy}</p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
