import type { Metadata } from "next";
import { PdfToPptWorkspace } from "@/features/docs/pdf-studio/components/pdf-to-ppt/pdf-to-ppt-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("pdf-to-ppt", "workspace");

export default function PdfToPptPage() {
  return <PdfToPptWorkspace />;
}
