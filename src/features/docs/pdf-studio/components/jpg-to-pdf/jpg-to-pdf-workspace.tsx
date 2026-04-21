"use client";

import { PdfStudioWorkspace } from "@/features/docs/pdf-studio/components/pdf-studio-workspace";

export function JpgToPdfWorkspace() {
  return (
    <PdfStudioWorkspace
      toolId="jpg-to-pdf"
      title="JPG to PDF"
      description="Upload JPG, JPEG, PNG, WebP, or HEIC images, arrange them, and export a single PDF entirely in your browser."
    />
  );
}
