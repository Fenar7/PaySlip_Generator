import type { VoucherDocument, VoucherExportFormat } from "@/features/voucher/types";
import {
  renderExportPdfViaBrowser,
  renderExportPngViaBrowser,
} from "@/lib/export/browser";
import { serializeExportPayload } from "@/lib/server/export-payload";

type ExportVoucherOptions = {
  voucherDocument: VoucherDocument;
  format: VoucherExportFormat;
  origin: string;
};

export async function exportVoucherDocument({
  voucherDocument,
  format,
  origin,
}: ExportVoucherOptions) {
  const payload = serializeExportPayload(voucherDocument);
  const headers = {
    "x-slipwise-export-payload": payload,
  };
  const renderUrl = `${origin}/voucher/print?mode=${format}`;

  if (format === "pdf") {
    return renderExportPdfViaBrowser(
      renderUrl,
      '[data-testid="voucher-render-ready"]',
      headers,
    );
  }

  return renderExportPngViaBrowser(
    renderUrl,
    '[data-testid="voucher-render-ready"]',
    headers,
  );
}
