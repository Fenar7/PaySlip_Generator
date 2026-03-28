import { InvoicePrintSurface } from "@/features/invoice/components/invoice-print-surface";
import { getInvoiceExportSession } from "@/features/invoice/server/export-session-store";

type InvoicePrintPageProps = {
  searchParams: Promise<{
    token?: string;
    mode?: string;
    autoprint?: string;
  }>;
};

export default async function InvoicePrintPage({
  searchParams,
}: InvoicePrintPageProps) {
  const params = await searchParams;
  const mode =
    params.mode === "pdf" || params.mode === "png" || params.mode === "print"
      ? params.mode
      : "print";
  const documentData = params.token
    ? getInvoiceExportSession(params.token)
    : null;

  return (
    <InvoicePrintSurface
      documentData={documentData}
      mode={mode}
      autoPrint={params.autoprint === "1"}
    />
  );
}
