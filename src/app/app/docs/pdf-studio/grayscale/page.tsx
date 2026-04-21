import type { Metadata } from "next";
import { GrayscaleWorkspace } from "@/features/docs/pdf-studio/components/grayscale/grayscale-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("grayscale", "workspace");

export default function GrayscalePdfPage() {
  return <GrayscaleWorkspace />;
}
