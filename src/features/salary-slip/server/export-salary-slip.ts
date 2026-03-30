import type {
  SalarySlipDocument,
  SalarySlipExportFormat,
} from "@/features/salary-slip/types";
import {
  renderExportPdfViaBrowser,
  renderExportPngViaBrowser,
} from "@/lib/export/browser";
import { serializeExportPayload } from "@/lib/server/export-payload";

type ExportSalarySlipOptions = {
  salarySlipDocument: SalarySlipDocument;
  format: SalarySlipExportFormat;
  origin: string;
};

export async function exportSalarySlipDocument({
  salarySlipDocument,
  format,
  origin,
}: ExportSalarySlipOptions) {
  const payload = serializeExportPayload(salarySlipDocument);
  const headers = {
    "x-slipwise-export-payload": payload,
  };
  const renderUrl = `${origin}/salary-slip/print?mode=${format}`;

  if (format === "pdf") {
    return renderExportPdfViaBrowser(
      renderUrl,
      '[data-testid="salary-slip-render-ready"]',
      headers,
    );
  }

  return renderExportPngViaBrowser(
    renderUrl,
    '[data-testid="salary-slip-render-ready"]',
    headers,
  );
}
