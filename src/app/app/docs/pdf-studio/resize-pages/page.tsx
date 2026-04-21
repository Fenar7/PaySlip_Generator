import type { Metadata } from "next";
import { ResizePagesWorkspace } from "@/features/docs/pdf-studio/components/resize-pages/resize-pages-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("resize-pages", "workspace");

export default function ResizePagesPage() {
  return <ResizePagesWorkspace />;
}
