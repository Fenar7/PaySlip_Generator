import type { Metadata } from "next";
import { ExtractPagesWorkspace } from "@/features/docs/pdf-studio/components/extract-pages/extract-pages-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata(
  "extract-pages",
  "workspace",
);

export default function ExtractPagesPage() {
  return <ExtractPagesWorkspace />;
}
