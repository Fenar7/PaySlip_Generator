import type { Metadata } from "next";
import { PdfStudioWorkspace } from "@/features/docs/pdf-studio/components/pdf-studio-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("create", "workspace");

export default function CreatePdfPage() {
  return <PdfStudioWorkspace />;
}
