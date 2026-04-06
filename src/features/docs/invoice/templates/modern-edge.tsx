import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import { cn } from "@/lib/utils";
import type { InvoiceDocument } from "@/features/docs/invoice/types";

export function ModernEdgeInvoiceTemplate({
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
    <div className="flex text-[var(--voucher-ink)]">
      {/* Left accent sidebar */}
      <div
        className="w-1 shrink-0 rounded-full"
        style={{ backgroundColor: "var(--voucher-accent)" }}
      />

      <div className="min-w-0 flex-1 space-y-8 pl-6">
        {/* ── Header ── */}
        <section className="document-break-inside-avoid">
          <div
            className={cn(
              "flex gap-6",
              printLike ? "flex-row items-start justify-between" : "flex-col md:flex-row md:items-start md:justify-between",
            )}
          >
            <div className="flex items-start gap-3.5">
              <DocumentBrandMark
                branding={document.branding}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(29,23,16,0.05)] p-1.5"
                initialsClassName="text-sm font-bold text-[var(--voucher-ink)]"
                imageClassName="h-full w-full rounded-lg object-cover"
              />
              <div>
                <h2 className="text-2xl font-bold leading-tight tracking-tight">
                  {document.branding.companyName}
                </h2>
                <p className="mt-0.5 text-xs tracking-wide text-[rgba(29,23,16,0.4)]">
                  {document.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--voucher-accent)" }}
              >
                {document.invoiceNumber}
              </div>
              <span className="text-sm text-[rgba(29,23,16,0.45)]">{document.invoiceDate}</span>
            </div>
          </div>
        </section>

        {/* ── From / To ── */}
        <section
          className={cn(
            "document-break-inside-avoid grid gap-8",
            printLike ? "grid-cols-2" : "md:grid-cols-2",
          )}
        >
          <div>
            <p
              className="border-b-2 pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.45)]"
              style={{ borderBottomColor: "var(--voucher-accent)" }}
            >
              From
            </p>
            <div className="mt-3 space-y-1 text-sm leading-6 text-[rgba(29,23,16,0.72)]">
              <p className="font-medium text-[var(--voucher-ink)]">{document.branding.companyName}</p>
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
              {document.businessTaxId ? <p>GSTIN: {document.businessTaxId}</p> : null}
            </div>
          </div>

          <div>
            <p
              className="border-b-2 pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.45)]"
              style={{ borderBottomColor: "var(--voucher-accent)" }}
            >
              Bill To
            </p>
            <div className="mt-3 space-y-1 text-sm leading-6 text-[rgba(29,23,16,0.72)]">
              <p className="font-medium text-[var(--voucher-ink)]">{document.clientName}</p>
              {document.clientAddress ? <p>{document.clientAddress}</p> : null}
              {document.clientEmail ? <p>{document.clientEmail}</p> : null}
              {document.clientPhone ? <p>{document.clientPhone}</p> : null}
              {document.clientTaxId ? <p>Tax ID: {document.clientTaxId}</p> : null}
            </div>
          </div>
        </section>

        {/* ── Due / Dates row ── */}
        <section
          className={cn(
            "document-break-inside-avoid grid gap-4",
            printLike ? "grid-cols-[1fr_auto]" : "md:grid-cols-[1fr_auto]",
          )}
        >
          {/* Due callout */}
          <div
            className="flex items-center gap-5 rounded-xl px-6 py-5 text-white"
            style={{ backgroundColor: "var(--voucher-accent)" }}
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
                Balance Due
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{document.balanceDueFormatted}</p>
            </div>
            <div className="ml-auto text-right text-sm leading-6 text-white/80">
              <p>{document.amountInWords}</p>
            </div>
          </div>

          {/* Date details */}
          <div className="flex flex-col justify-center space-y-1 text-sm">
            {document.dueDate ? (
              <div className="flex gap-2">
                <span className="text-xs uppercase tracking-wider text-[rgba(29,23,16,0.4)]">Due</span>
                <span className="font-medium">{document.dueDate}</span>
              </div>
            ) : null}
            {document.placeOfSupply ? (
              <div className="flex gap-2">
                <span className="text-xs uppercase tracking-wider text-[rgba(29,23,16,0.4)]">Supply</span>
                <span className="font-medium">{document.placeOfSupply}</span>
              </div>
            ) : null}
          </div>
        </section>

        {/* ── Shipping ── */}
        {document.shippingAddress ? (
          <section className="document-break-inside-avoid">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.4)]">
              Ship To
            </p>
            <p className="mt-1.5 text-sm leading-6 text-[rgba(29,23,16,0.72)]">
              {document.shippingAddress}
            </p>
          </section>
        ) : null}

        {/* ── Line Items — editorial sub-row style ── */}
        <section>
          {/* Header row */}
          <div
            className={cn(
              "document-table-head grid border-b-2 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.45)]",
              printLike
                ? "grid-cols-[1fr_5rem_6rem_6rem_6rem]"
                : "grid-cols-[1fr_5rem_6rem_6rem_6rem]",
            )}
          >
            <span>Item</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Tax</span>
            <span className="text-right">Total</span>
          </div>

          {/* Items */}
          {document.lineItems.map((item) => (
            <div
              key={`${item.description}-${item.lineTotal}`}
              className="document-table-row-avoid border-b border-[rgba(29,23,16,0.08)] py-3"
            >
              <div
                className={cn(
                  "grid items-start",
                  printLike
                    ? "grid-cols-[1fr_5rem_6rem_6rem_6rem]"
                    : "grid-cols-[1fr_5rem_6rem_6rem_6rem]",
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-[rgba(29,23,16,0.88)]">
                    {item.description}
                  </p>
                  {item.discountAmount > 0 ? (
                    <p className="mt-0.5 text-xs text-[rgba(29,23,16,0.45)]">
                      Discount: {item.discountAmountFormatted}
                    </p>
                  ) : null}
                </div>
                <span className="text-center text-sm text-[rgba(29,23,16,0.65)]">
                  {item.quantity}
                </span>
                <span className="text-right text-sm text-[rgba(29,23,16,0.65)]">
                  {item.unitPriceFormatted}
                </span>
                <span className="text-right text-sm text-[rgba(29,23,16,0.65)]">
                  {item.taxAmountFormatted}
                </span>
                <span className="text-right text-sm font-semibold">
                  {item.lineTotalFormatted}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* ── Summary ── */}
        <section
          className={cn(
            "document-break-inside-avoid grid gap-6",
            printLike ? "grid-cols-[1fr_17rem]" : "md:grid-cols-[1fr_17rem]",
          )}
        >
          {/* Left: notes / terms */}
          <div className="space-y-5">
            {document.notes ? (
              <div className="document-break-inside-avoid">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.4)]">
                  Notes
                </p>
                <p className="mt-2 text-sm leading-6 text-[rgba(29,23,16,0.7)]">{document.notes}</p>
              </div>
            ) : null}
            {document.terms ? (
              <div className="document-break-inside-avoid">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.4)]">
                  Terms &amp; Conditions
                </p>
                <p className="mt-2 text-sm leading-6 text-[rgba(29,23,16,0.7)]">{document.terms}</p>
              </div>
            ) : null}
          </div>

          {/* Right: totals */}
          <div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[rgba(29,23,16,0.55)]">Subtotal</span>
                <span>{document.subtotalFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[rgba(29,23,16,0.55)]">Discount</span>
                <span>{document.totalDiscountFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[rgba(29,23,16,0.55)]">Tax</span>
                <span>{document.totalTaxFormatted}</span>
              </div>
              {document.extraCharges > 0 ? (
                <div className="flex justify-between">
                  <span className="text-[rgba(29,23,16,0.55)]">Extra Charges</span>
                  <span>{document.extraChargesFormatted}</span>
                </div>
              ) : null}
              {document.invoiceLevelDiscount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-[rgba(29,23,16,0.55)]">Invoice Discount</span>
                  <span>{document.invoiceLevelDiscountFormatted}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex justify-between border-t-[3px] border-[var(--voucher-ink)] pt-3">
              <span className="text-base font-bold">Total</span>
              <span className="text-xl font-bold">{document.grandTotalFormatted}</span>
            </div>

            {document.visibility.showPaymentSummary ? (
              <div className="mt-3 space-y-1.5 border-t border-[rgba(29,23,16,0.1)] pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[rgba(29,23,16,0.55)]">Amount Paid</span>
                  <span>{document.amountPaidFormatted}</span>
                </div>
                <div className="flex justify-between font-bold" style={{ color: "var(--voucher-accent)" }}>
                  <span>Due</span>
                  <span className="text-lg">{document.balanceDueFormatted}</span>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* ── Bank Details & Signature ── */}
        {showBank || (document.visibility.showSignature && document.authorizedBy) ? (
          <section
            className={cn(
              "document-break-inside-avoid grid border-t border-[rgba(29,23,16,0.1)] pt-5",
              printLike ? "grid-cols-2 gap-8" : "gap-5 md:grid-cols-2 md:gap-8",
            )}
          >
            {showBank ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.4)]">
                  Payment Details
                </p>
                <div className="mt-2 space-y-1 text-sm leading-5 text-[rgba(29,23,16,0.72)]">
                  {document.bankName ? <p>{document.bankName}</p> : null}
                  {document.bankAccountNumber ? <p>A/C: {document.bankAccountNumber}</p> : null}
                  {document.bankIfsc ? <p>IFSC: {document.bankIfsc}</p> : null}
                </div>
              </div>
            ) : (
              <div />
            )}

            {document.visibility.showSignature && document.authorizedBy ? (
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgba(29,23,16,0.4)]">
                  Authorized By
                </p>
                <p className="mt-8 text-sm font-medium">{document.authorizedBy}</p>
                <div
                  className="mx-auto mt-1 h-0.5 w-32 rounded-full"
                  style={{ backgroundColor: "var(--voucher-accent)", marginLeft: "auto" }}
                />
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
