"use client";

import { ServerConversionWorkspace } from "@/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace";

export function HtmlToPdfWorkspace() {
  return (
    <ServerConversionWorkspace
      toolId="html-to-pdf"
      title="HTML to PDF"
      description="Upload an HTML file or provide a public URL, then queue a PDF export with server-side print rendering, page size, margin, and print CSS support."
      targetFormat="pdf"
      allowUrl
    />
  );
}
