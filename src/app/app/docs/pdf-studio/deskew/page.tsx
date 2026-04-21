import type { Metadata } from "next";
import { DeskewWorkspace } from "@/features/docs/pdf-studio/components/deskew/deskew-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("deskew", "workspace");

export default function DeskewPage() {
  return <DeskewWorkspace />;
}
