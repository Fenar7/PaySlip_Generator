import { DocumentBrandMark } from "@/components/document/document-brand-mark";
import { cn } from "@/lib/utils";
import type { VoucherDocument } from "@/features/docs/voucher/types";

type VoucherTemplateProps = {
  document: VoucherDocument;
  mode?: "preview" | "print" | "pdf" | "png";
};

export function ModernCardVoucherTemplate({
  document,
  mode = "preview",
}: VoucherTemplateProps) {
  const printLikeMode = mode !== "preview";

  return (
    <div className="space-y-6 text-[var(--voucher-ink)]">
      {/* Header: logo + company name + voucher type pill */}
      <header className="document-break-inside-avoid flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <DocumentBrandMark
            branding={document.branding}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.92)] p-2"
            initialsClassName="text-base font-bold text-[var(--voucher-accent)]"
            imageClassName="h-full w-full rounded-xl object-cover"
          />
          <div>
            <h2 className="text-xl font-semibold leading-tight">
              {document.branding.companyName || "Slipwise"}
            </h2>
            <div className="mt-1 space-y-0.5 text-xs leading-5 text-[rgba(29,23,16,0.55)]">
              {document.visibility.showAddress && document.branding.address ? (
                <p>{document.branding.address}</p>
              ) : null}
              <span className="flex flex-wrap gap-x-3">
                {document.visibility.showEmail && document.branding.email ? (
                  <span>{document.branding.email}</span>
                ) : null}
                {document.visibility.showPhone && document.branding.phone ? (
                  <span>{document.branding.phone}</span>
                ) : null}
              </span>
            </div>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white"
          style={{ backgroundColor: "var(--voucher-accent)" }}
        >
          {document.voucherType === "payment" ? "Payment" : "Receipt"}
        </span>
      </header>

      {/* Amount hero card */}
      <section
        className="document-break-inside-avoid rounded-3xl p-8 text-center"
        style={{
          background:
            "linear-gradient(135deg, var(--voucher-accent), color-mix(in srgb, var(--voucher-accent) 78%, #000))",
        }}
      >
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/60">
          Amount
        </p>
        <p className="mt-3 text-4xl font-bold text-white">
          {document.amountFormatted}
        </p>
        <p className="mt-3 text-sm italic leading-6 text-white/75">
          {document.amountInWords}
        </p>
      </section>

      {/* Details grid — floating cards */}
      <div
        className={cn(
          "document-break-inside-avoid grid gap-3",
          printLikeMode ? "grid-cols-2" : "sm:grid-cols-2",
        )}
      >
        <DetailCard label="Voucher No." value={document.voucherNumber} />
        <DetailCard label="Date" value={document.date} />
        <DetailCard
          label={document.counterpartyLabel}
          value={document.counterpartyName}
        />
        {document.visibility.showPaymentMode && document.paymentMode ? (
          <DetailCard label="Payment Mode" value={document.paymentMode} />
        ) : null}
        {document.visibility.showReferenceNumber && document.referenceNumber ? (
          <DetailCard label="Reference" value={document.referenceNumber} />
        ) : null}
      </div>

      {/* Purpose callout */}
      <section
        className="document-break-inside-avoid rounded-2xl border border-[rgba(29,23,16,0.06)] bg-[rgba(255,255,255,0.92)] p-5"
        style={{ borderLeft: "4px solid var(--voucher-accent)" }}
      >
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
          Purpose / Narration
        </p>
        <p className="mt-2 text-sm leading-7 text-[rgba(29,23,16,0.82)]">
          {document.purpose}
        </p>
      </section>

      {/* Notes */}
      {document.visibility.showNotes && document.notes ? (
        <section className="document-break-inside-avoid rounded-2xl border border-dashed border-[rgba(29,23,16,0.14)] bg-[rgba(255,255,255,0.7)] p-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
            Notes
          </p>
          <p className="mt-2 text-sm leading-7 text-[rgba(29,23,16,0.75)]">
            {document.notes}
          </p>
        </section>
      ) : null}

      {/* Signature cards */}
      {document.visibility.showSignatureArea ? (
        <section
          className={cn(
            "document-break-inside-avoid grid gap-3",
            printLikeMode ? "grid-cols-2" : "md:grid-cols-2",
          )}
        >
          {document.visibility.showApprovedBy ? (
            <div className="rounded-2xl border border-[rgba(29,23,16,0.06)] bg-[rgba(255,255,255,0.92)] p-5">
              <div
                className="mb-4 h-0.5 w-full rounded-full"
                style={{ backgroundColor: "var(--voucher-accent)" }}
              />
              <div className="h-14 border-b border-dashed border-[rgba(29,23,16,0.14)]" />
              <p className="mt-3 text-sm font-medium text-[rgba(29,23,16,0.8)]">
                {document.approvedBy
                  ? `Approved by: ${document.approvedBy}`
                  : "Approved by"}
              </p>
            </div>
          ) : null}
          {document.visibility.showReceivedBy ? (
            <div className="rounded-2xl border border-[rgba(29,23,16,0.06)] bg-[rgba(255,255,255,0.92)] p-5">
              <div
                className="mb-4 h-0.5 w-full rounded-full"
                style={{ backgroundColor: "var(--voucher-accent)" }}
              />
              <div className="h-14 border-b border-dashed border-[rgba(29,23,16,0.14)]" />
              <p className="mt-3 text-sm font-medium text-[rgba(29,23,16,0.8)]">
                {document.receivedBy
                  ? `Received by: ${document.receivedBy}`
                  : "Received by"}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(29,23,16,0.06)] bg-[rgba(255,255,255,0.92)] p-4">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.42)]">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-medium text-[rgba(29,23,16,0.88)]">
        {value}
      </p>
    </div>
  );
}
