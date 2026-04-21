"use client";

import { ServerConversionWorkspace } from "@/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace";

export function PdfToWordWorkspace() {
  return (
    <ServerConversionWorkspace
      toolId="pdf-to-word"
      title="PDF to Word"
      description="Queue a DOCX conversion when you need editable text and can accept layout simplification in exchange for a reliable server-side export."
      targetFormat="docx"
    />
  );
}
