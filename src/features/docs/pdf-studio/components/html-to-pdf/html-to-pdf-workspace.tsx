"use client";

import { ServerConversionWorkspace } from "@/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace";

export function HtmlToPdfWorkspace() {
  return (
    <ServerConversionWorkspace
      toolId="html-to-pdf"
      title="HTML to PDF"
      description="Upload a self-contained HTML file, then queue a PDF export with server-side print rendering, page size, margin, and print CSS support."
      targetFormat="pdf"
      notice="HTML to PDF only accepts self-contained HTML uploads. Remote URL fetching is disabled, and external or relative assets are blocked instead of rendering a misleading partial PDF."
    />
  );
}
