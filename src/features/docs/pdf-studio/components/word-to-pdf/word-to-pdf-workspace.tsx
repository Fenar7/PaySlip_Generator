"use client";

import { ServerConversionWorkspace } from "@/features/docs/pdf-studio/components/server-conversion/server-conversion-workspace";

export function WordToPdfWorkspace() {
  return (
    <ServerConversionWorkspace
      toolId="word-to-pdf"
      title="Word to PDF"
      description="Upload a DOCX file and queue a print-layout PDF export with server-side rendering and deterministic naming."
      targetFormat="pdf"
    />
  );
}
