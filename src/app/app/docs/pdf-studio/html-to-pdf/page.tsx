import type { Metadata } from "next";
import { HtmlToPdfWorkspace } from "@/features/docs/pdf-studio/components/html-to-pdf/html-to-pdf-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("html-to-pdf", "workspace");

export default function HtmlToPdfPage() {
  return <HtmlToPdfWorkspace />;
}
