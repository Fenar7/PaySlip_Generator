"use client";

import { ServerConversionWorkspace } from "@/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace";

export function PdfToExcelWorkspace() {
  return (
    <ServerConversionWorkspace
      toolId="pdf-to-excel"
      title="PDF to Excel"
      description="Queue an XLSX export that detects rows and columns per page, then rebuilds each source page as its own worksheet."
      targetFormat="xlsx"
      notice="These conversions run on a queued server worker. Table-like PDFs convert best; narrative pages are exported as reading-order rows, and charts or embedded graphics are not recreated as native Excel objects."
    />
  );
}
