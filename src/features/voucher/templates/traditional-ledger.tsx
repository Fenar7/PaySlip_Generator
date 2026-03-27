import { cn } from "@/lib/utils";
import type { VoucherDocument } from "@/features/voucher/types";

type VoucherTemplateProps = {
  document: VoucherDocument;
  mode?: "preview" | "print";
};

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-4 border-b border-[rgba(29,23,16,0.08)] py-3 text-sm">
      <p className="font-semibold uppercase tracking-[0.14em] text-[rgba(29,23,16,0.55)]">
        {label}
      </p>
      <p className="text-[rgba(29,23,16,0.82)]">{value}</p>
    </div>
  );
}

export function TraditionalLedgerVoucherTemplate({
  document,
  mode = "preview",
}: VoucherTemplateProps) {
  const isPrint = mode === "print";

  return (
    <div className="space-y-6 text-[var(--voucher-ink)]">
      <section className="rounded-[1.5rem] border-2 border-[rgba(29,23,16,0.12)] bg-[rgba(255,255,255,0.92)]">
        <div
          className="rounded-t-[1.35rem] px-6 py-5 text-white"
          style={{ backgroundColor: "var(--voucher-accent)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-white/72">
                Formal voucher record
              </p>
              <h2 className="mt-3 text-[1.8rem] font-medium">{document.title}</h2>
            </div>
            <p className="text-right text-sm leading-7 text-white/82">
              {document.branding.companyName || "Business Document Generator"}
            </p>
          </div>
        </div>

        <div className="space-y-1 px-6 py-5">
          <Row label="Voucher number" value={document.voucherNumber} />
          <Row label="Date" value={document.date} />
          <Row label={document.counterpartyLabel} value={document.counterpartyName} />
          <Row label="Amount" value={`${document.amountFormatted} (${document.amountInWords})`} />
          {document.paymentMode ? (
            <Row label="Payment mode" value={document.paymentMode} />
          ) : null}
          {document.referenceNumber ? (
            <Row label="Reference" value={document.referenceNumber} />
          ) : null}
          <Row label="Purpose" value={document.purpose} />
          {document.notes ? <Row label="Notes" value={document.notes} /> : null}
        </div>
      </section>

      <section
        className={cn(
          "grid gap-4",
          isPrint ? "grid-cols-[1fr_0.8fr]" : "md:grid-cols-[1fr_0.8fr]",
        )}
      >
        <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.88)] p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
            Business details
          </p>
          <div className="mt-4 space-y-2 text-sm leading-7 text-[rgba(29,23,16,0.82)]">
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

        {document.visibility.showSignatureArea ? (
          <div className="rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-[rgba(255,255,255,0.88)] p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]">
              Authorization
            </p>
            <div className="mt-4 space-y-5">
              {document.approvedBy ? (
                <div>
                  <div className="h-12 border-b border-dashed border-[rgba(29,23,16,0.16)]" />
                  <p className="mt-3 text-sm font-medium">Approved by: {document.approvedBy}</p>
                </div>
              ) : null}
              {document.receivedBy ? (
                <div>
                  <div className="h-12 border-b border-dashed border-[rgba(29,23,16,0.16)]" />
                  <p className="mt-3 text-sm font-medium">Received by: {document.receivedBy}</p>
                </div>
              ) : null}
              {!document.approvedBy && !document.receivedBy ? (
                <p className="text-sm text-[rgba(29,23,16,0.65)]">
                  Signature lines will appear here once names are provided.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
