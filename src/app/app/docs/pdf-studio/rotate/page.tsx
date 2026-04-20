import type { Metadata } from "next";
import { RotatePagesWorkspace } from "@/features/docs/pdf-studio/components/rotate/rotate-pages-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("rotate", "workspace");

export default function RotatePagesPage() {
  return <RotatePagesWorkspace />;
}
