import type { Metadata } from "next";
import { PdfToWordWorkspace } from "@/features/docs/pdf-studio/components/pdf-to-word/pdf-to-word-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("pdf-to-word", "workspace");

export default function PdfToWordPage() {
  return <PdfToWordWorkspace />;
}
