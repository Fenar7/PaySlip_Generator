import type { Metadata } from "next";
import { OcrWorkspace } from "@/features/docs/pdf-studio/components/ocr/ocr-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("ocr", "workspace");

export default function OcrPage() {
  return <OcrWorkspace />;
}
