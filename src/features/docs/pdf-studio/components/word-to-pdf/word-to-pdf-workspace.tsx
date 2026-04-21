"use client";

import { ServerConversionWorkspace } from "@/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace";

export function WordToPdfWorkspace() {
  return (
    <ServerConversionWorkspace
      toolId="word-to-pdf"
      title="Word to PDF"
      description="Upload a DOCX file and queue a print-layout PDF export with deterministic naming and stricter DOCX validation."
      targetFormat="pdf"
      notice="These conversions run on a queued server worker. Standard DOCX files render best; macro-enabled or malformed Word packages are rejected before the job is queued."
    />
  );
}
