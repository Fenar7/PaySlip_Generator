"use client";

import { ServerConversionWorkspace } from "@/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace";

export function PdfToPptWorkspace() {
  return (
    <ServerConversionWorkspace
      toolId="pdf-to-ppt"
      title="PDF to PPT"
      description="Queue a PPTX export with one slide per source page and clear messaging that the output is content-first rather than pixel-perfect."
      targetFormat="pptx"
    />
  );
}
