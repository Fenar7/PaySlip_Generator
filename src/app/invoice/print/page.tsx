import { headers } from "next/headers";
import { InvoicePrintSurface } from "@/features/invoice/components/invoice-print-surface";
import { getInvoiceExportSession } from "@/features/invoice/server/export-session-store";
import type { InvoiceDocument } from "@/features/invoice/types";
import { deserializeExportPayload } from "@/lib/server/export-payload";

type InvoicePrintPageProps = {
  searchParams: Promise<{
    token?: string;
    payload?: string;
    mode?: string;
    autoprint?: string;
  }>;
};

export default async function InvoicePrintPage({
  searchParams,
}: InvoicePrintPageProps) {
  const requestHeaders = await headers();
  const params = await searchParams;
  const mode =
    params.mode === "pdf" || params.mode === "png" || params.mode === "print"
      ? params.mode
      : "print";
  const documentData =
    (requestHeaders.get("x-slipwise-export-payload")
      ? deserializeExportPayload<InvoiceDocument>(
          requestHeaders.get("x-slipwise-export-payload") as string,
        )
      : null) ??
    (params.payload
      ? deserializeExportPayload<InvoiceDocument>(params.payload)
      : null) ?? (params.token ? getInvoiceExportSession(params.token) : null);

  return (
    <InvoicePrintSurface
      documentData={documentData}
      mode={mode}
      autoPrint={params.autoprint === "1"}
    />
  );
}
