import type { Metadata } from "next";
import { PdfToImageWorkspace } from "@/features/docs/pdf-studio/components/pdf-to-image/pdf-to-image-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("pdf-to-image", "workspace");

export default function PdfToImagePage() {
  return <PdfToImageWorkspace />;
}
