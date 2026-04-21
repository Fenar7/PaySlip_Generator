import type { Metadata } from "next";
import { SplitWorkspace } from "@/features/docs/pdf-studio/components/split/split-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("split", "workspace");

export default function SplitPage() {
  return <SplitWorkspace />;
}
