import type { Metadata } from "next";
import { BatesWorkspace } from "@/features/docs/pdf-studio/components/bates/bates-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("bates", "workspace");

export default function BatesPage() {
  return <BatesWorkspace />;
}
