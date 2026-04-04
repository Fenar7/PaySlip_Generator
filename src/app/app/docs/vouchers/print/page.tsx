import { headers } from "next/headers";
import { VoucherPrintSurface } from "@/features/docs/voucher/components/voucher-print-surface";
import { getVoucherExportSession } from "@/features/docs/voucher/server/export-session-store";
import type { VoucherDocument } from "@/features/docs/voucher/types";
import { deserializeExportPayload } from "@/lib/server/export-payload";

export const dynamic = "force-dynamic";

type VoucherPrintPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VoucherPrintPage({
  searchParams,
}: VoucherPrintPageProps) {
  const requestHeaders = await headers();
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const payload = typeof params.payload === "string" ? params.payload : "";
  const rawMode = typeof params.mode === "string" ? params.mode : "print";
  const autoPrint = params.autoprint === "1";
  const mode =
    rawMode === "pdf" || rawMode === "png" || rawMode === "print"
      ? rawMode
      : "print";
  const documentData =
    (requestHeaders.get("x-slipwise-export-payload")
      ? deserializeExportPayload<VoucherDocument>(
          requestHeaders.get("x-slipwise-export-payload") as string,
        )
      : null) ??
    (payload
      ? deserializeExportPayload<VoucherDocument>(payload)
      : null) ?? (token ? getVoucherExportSession(token) : null);

  return (
    <VoucherPrintSurface
      documentData={documentData}
      mode={mode}
      autoPrint={autoPrint}
    />
  );
}
