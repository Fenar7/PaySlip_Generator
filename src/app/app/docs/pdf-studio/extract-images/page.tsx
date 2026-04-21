import type { Metadata } from "next";
import { ExtractImagesWorkspace } from "@/features/docs/pdf-studio/components/extract-images/extract-images-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("extract-images", "workspace");

export default function ExtractImagesPage() {
  return <ExtractImagesWorkspace />;
}
