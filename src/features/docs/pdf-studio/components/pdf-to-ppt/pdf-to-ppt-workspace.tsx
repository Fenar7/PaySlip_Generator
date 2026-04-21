"use client";

import { ServerConversionWorkspace } from "@/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace";

export function PdfToPptWorkspace() {
  return (
    <ServerConversionWorkspace
      toolId="pdf-to-ppt"
      title="PDF to PPT"
      description="Queue a PPTX export that maps each PDF page into positioned, editable text boxes on its own slide."
      targetFormat="pptx"
      notice="These conversions run on a queued server worker. Text placement is preserved slide-by-slide, but images, charts, and advanced page graphics still need cleanup in PowerPoint."
    />
  );
}
