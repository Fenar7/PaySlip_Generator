"use client";

import { ServerConversionWorkspace } from "@/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace";

export function PdfToExcelWorkspace() {
  return (
    <ServerConversionWorkspace
      toolId="pdf-to-excel"
      title="PDF to Excel"
      description="Queue an XLSX export that turns extracted page text into worksheet rows with clear messaging about table and layout fidelity."
      targetFormat="xlsx"
    />
  );
}
