import { VoucherDocumentFrame } from "@/features/docs/voucher/components/voucher-document-frame";
import { VoucherPrintEffects } from "@/features/docs/voucher/components/voucher-print-effects";
import type { VoucherDocument } from "@/features/docs/voucher/types";

type VoucherPrintSurfaceProps = {
  documentData: VoucherDocument | null;
  mode: "print" | "pdf" | "png";
  autoPrint?: boolean;
};

export function VoucherPrintSurface({
  documentData,
  mode,
  autoPrint = false,
}: VoucherPrintSurfaceProps) {
  if (!documentData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
            Voucher render
          </p>
          <h1 className="mt-4 text-3xl text-[var(--foreground)]">
            Render payload unavailable
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)]">
            Open this page through the voucher workspace so the normalized document
            payload can be passed into the print surface.
          </p>
        </div>
      </main>
    );
  }

  const bodyClasses =
    mode === "print"
      ? "min-h-screen bg-white px-4 py-6 md:px-8 md:py-10"
      : "min-h-screen bg-white p-0";

  return (
    <main className={bodyClasses}>
      <VoucherPrintEffects
        title={`${documentData.title} ${documentData.voucherNumber}`}
        autoPrint={mode === "print" && autoPrint}
      />
      <div
        className={
          mode === "print"
            ? "mx-auto w-fit rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-white shadow-[0_24px_48px_rgba(38,30,20,0.08)]"
            : "mx-auto w-fit"
        }
      >
        <VoucherDocumentFrame document={documentData} mode={mode} />
      </div>
    </main>
  );
}
