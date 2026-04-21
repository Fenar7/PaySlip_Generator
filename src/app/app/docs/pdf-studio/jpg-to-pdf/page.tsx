import type { Metadata } from "next";
import { JpgToPdfWorkspace } from "@/features/docs/pdf-studio/components/jpg-to-pdf/jpg-to-pdf-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("jpg-to-pdf", "workspace");

export default function JpgToPdfPage() {
  return <JpgToPdfWorkspace />;
}
