import type { Metadata } from "next";
import { PdfStudioHub } from "@/features/docs/pdf-studio/components/pdf-studio-hub";
import { buildPdfStudioHubMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioHubMetadata("public");

export default function PdfStudioPage() {
  return <PdfStudioHub surface="public" />;
}
