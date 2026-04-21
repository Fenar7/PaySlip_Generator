import type { Metadata } from "next";
import { WatermarkWorkspace } from "@/features/docs/pdf-studio/components/watermark/watermark-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("watermark", "workspace");

export default function WatermarkPdfPage() {
  return <WatermarkWorkspace />;
}
