import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import { cn } from "@/lib/utils";
import type { VoucherDocument } from "@/features/docs/voucher/types";

type VoucherTemplateProps = {
  document: VoucherDocument;
  mode?: "preview" | "print" | "pdf" | "png";
};

export function FormalBorderedVoucherTemplate({
  document,
  mode = "preview",
}: VoucherTemplateProps) {
  const printLikeMode = mode !== "preview";

  const rows: { label: string; value: string }[] = [
    { label: "Voucher No.", value: document.voucherNumber },
    { label: "Date", value: document.date },
    { label: document.counterpartyLabel, value: document.counterpartyName },
    {
      label: "Amount",
      value: `${document.amountFormatted}  —  ${document.amountInWords}`,
    },
  ];
  if (document.visibility.showPaymentMode && document.paymentMode) {
    rows.push({ label: "Payment Mode", value: document.paymentMode });
  }
  if (document.visibility.showReferenceNumber && document.referenceNumber) {
    rows.push({ label: "Reference No.", value: document.referenceNumber });
  }
  rows.push({ label: "Purpose", value: document.purpose });
  if (document.visibility.showNotes && document.notes) {
    rows.push({ label: "Notes", value: document.notes });
  }

  return (
    <div className="space-y-0 text-[var(--voucher-ink)]">
      {/* Outer double border */}
      <div className="document-break-inside-avoid border-2 border-[var(--voucher-ink)] p-1">
        <div className="border border-[rgba(29,23,16,0.35)]">
          {/* Top banner */}
          <div className="flex items-center justify-between border-b border-[rgba(29,23,16,0.35)] px-6 py-4">
            <div className="flex items-center gap-3">
              <DocumentBrandMark
                branding={document.branding}
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-[rgba(29,23,16,0.15)] bg-[rgba(255,255,255,0.9)] p-1.5"
                initialsClassName="text-xs font-bold text-[var(--voucher-accent)]"
                imageClassName="h-full w-full object-cover"
              />
              <span className="text-lg font-semibold">
                {document.branding.companyName || "Slipwise"}
              </span>
            </div>
            <h1 className="text-xl font-bold uppercase tracking-[0.16em]">
              {document.voucherType === "payment"
                ? "Payment Voucher"
                : "Receipt Voucher"}
            </h1>
          </div>

          {/* Company details row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-[rgba(29,23,16,0.2)] px-6 py-2 text-xs text-[rgba(29,23,16,0.6)]">
            {document.visibility.showAddress && document.branding.address ? (
              <span>{document.branding.address}</span>
            ) : null}
            {document.visibility.showEmail && document.branding.email ? (
              <span>{document.branding.email}</span>
            ) : null}
            {document.visibility.showPhone && document.branding.phone ? (
              <span>{document.branding.phone}</span>
            ) : null}
          </div>

          {/* Structured form rows — zebra striped */}
          <div>
            {rows.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  "grid gap-2 border-b border-[rgba(29,23,16,0.12)] px-6 py-3 text-sm last:border-b-0",
                  printLikeMode
                    ? "grid-cols-[9rem_1fr]"
                    : "grid-cols-[9rem_1fr]",
                  i % 2 === 0
                    ? "bg-[rgba(29,23,16,0.03)]"
                    : "bg-transparent",
                )}
              >
                <span className="font-semibold uppercase tracking-[0.1em] text-[rgba(29,23,16,0.52)]">
                  {row.label}
                </span>
                <span className="text-[rgba(29,23,16,0.85)]">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Signature section */}
          {document.visibility.showSignatureArea ? (
            <div
              className={cn(
                "document-break-inside-avoid grid border-t border-[rgba(29,23,16,0.35)]",
                printLikeMode ? "grid-cols-2" : "md:grid-cols-2",
              )}
            >
              {document.visibility.showApprovedBy ? (
                <div
                  className={cn(
                    "px-6 py-5",
                    printLikeMode
                      ? "border-r border-[rgba(29,23,16,0.2)]"
                      : "md:border-r md:border-[rgba(29,23,16,0.2)]",
                  )}
                >
                  <div className="mt-8 border-b border-dotted border-[rgba(29,23,16,0.4)]" />
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(29,23,16,0.5)]">
                    {document.approvedBy
                      ? `Approved by: ${document.approvedBy}`
                      : "Approved by"}
                  </p>
                </div>
              ) : null}
              {document.visibility.showReceivedBy ? (
                <div className="px-6 py-5">
                  <div className="mt-8 border-b border-dotted border-[rgba(29,23,16,0.4)]" />
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(29,23,16,0.5)]">
                    {document.receivedBy
                      ? `Received by: ${document.receivedBy}`
                      : "Received by"}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
