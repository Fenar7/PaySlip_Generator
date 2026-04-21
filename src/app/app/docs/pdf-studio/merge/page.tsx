import type { Metadata } from "next";
import { MergeWorkspace } from "@/features/docs/pdf-studio/components/merge/merge-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("merge", "workspace");

export default function MergePage() {
  return <MergeWorkspace />;
}
