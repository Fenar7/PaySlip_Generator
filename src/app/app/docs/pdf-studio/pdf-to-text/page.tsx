import type { Metadata } from "next";
import { PdfToTextWorkspace } from "@/features/docs/pdf-studio/components/pdf-to-text/pdf-to-text-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("pdf-to-text", "workspace");

export default function PdfToTextPage() {
  return <PdfToTextWorkspace />;
}
