import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import { cn } from "@/lib/utils";
import type { VoucherDocument } from "@/features/docs/voucher/types";

type VoucherTemplateProps = {
  document: VoucherDocument;
  mode?: "preview" | "print" | "pdf" | "png";
};

function HeaderBrand({ document }: VoucherTemplateProps) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-[rgba(29,23,16,0.08)] pb-6">
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.34em] text-[rgba(29,23,16,0.45)]">
          {document.title}
        </p>
        <h2 className="mt-3 text-[1.85rem] font-medium leading-tight text-[var(--voucher-ink)]">
          {document.branding.companyName || "Slipwise"}
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
      <DocumentBrandMark branding={document.branding} />
    </div>
  );
}

export function MinimalOfficeVoucherTemplate({
  document,
  mode = "preview",
}: VoucherTemplateProps) {
  const printLikeMode = mode !== "preview";

  return (
    <div className="space-y-6 text-[var(--voucher-ink)]">
      <HeaderBrand document={document} />

      <div
        className={cn(
          "document-break-inside-avoid grid gap-4",
          printLikeMode ? "grid-cols-[1.15fr_0.85fr]" : "md:grid-cols-[1.15fr_0.85fr]",
        )}
      >
        <section className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.86)] p-5">
          <div
            className={cn(
              "grid gap-4",
              printLikeMode ? "grid-cols-2" : "sm:grid-cols-2",
            )}
          >
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                Voucher no.
              </p>
              <p className="mt-2 text-base font-medium">{document.voucherNumber}</p>
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                Date
              </p>
              <p className="mt-2 text-base font-medium">{document.date}</p>
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                {document.counterpartyLabel}
              </p>
              <p className="mt-2 text-base font-medium">{document.counterpartyName}</p>
            </div>
            {document.paymentMode ? (
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                  Payment mode
                </p>
                <p className="mt-2 text-base font-medium">{document.paymentMode}</p>
              </div>
            ) : null}
            {document.referenceNumber ? (
              <div className="sm:col-span-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
                  Reference
                </p>
                <p className="mt-2 text-base font-medium">{document.referenceNumber}</p>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="rounded-[1.5rem] p-5 text-white" style={{ backgroundColor: "var(--voucher-accent)" }}>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-white/70">
            Amount
          </p>
          <p className="mt-3 text-3xl font-medium">{document.amountFormatted}</p>
          <p className="mt-4 text-sm leading-7 text-white/82">{document.amountInWords}</p>
        </aside>
      </div>

      <section className="document-break-inside-avoid rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.9)] p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
          Purpose / Narration
        </p>
        <p className="mt-3 text-sm leading-7 text-[rgba(29,23,16,0.82)]">
          {document.purpose}
        </p>
      </section>

      {document.notes ? (
        <section className="document-break-inside-avoid rounded-[1.5rem] border border-dashed border-[rgba(29,23,16,0.12)] bg-[rgba(255,255,255,0.72)] p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
            Notes
          </p>
          <p className="mt-3 text-sm leading-7 text-[rgba(29,23,16,0.8)]">
            {document.notes}
          </p>
        </section>
      ) : null}

      {document.visibility.showSignatureArea ? (
        <section
          className={cn(
            "document-break-inside-avoid grid gap-4",
            printLikeMode ? "grid-cols-2" : "md:grid-cols-2",
          )}
        >
          <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.9)] p-5">
            <div className="h-16 border-b border-dashed border-[rgba(29,23,16,0.16)]" />
            <p className="mt-4 text-sm font-medium text-[rgba(29,23,16,0.82)]">
              {document.approvedBy ? `Approved by: ${document.approvedBy}` : "Approved by"}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.9)] p-5">
            <div className="h-16 border-b border-dashed border-[rgba(29,23,16,0.16)]" />
            <p className="mt-4 text-sm font-medium text-[rgba(29,23,16,0.82)]">
              {document.receivedBy ? `Received by: ${document.receivedBy}` : "Received by"}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
