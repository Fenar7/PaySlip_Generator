"use client";

import { ServerConversionWorkspace } from "@/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace";

export function PdfToWordWorkspace() {
  return (
    <ServerConversionWorkspace
      toolId="pdf-to-word"
      title="PDF to Word"
      description="Queue a DOCX conversion that rebuilds page headings, paragraphs, indentation, and detected tables for text-led PDFs."
      targetFormat="docx"
      notice="These conversions run on a queued server worker. PDF to Word preserves reading order and detected tables, but complex artwork, forms, or scan-heavy pages still need review after export."
    />
  );
}
