import type { Metadata } from "next";
import { RemoveAnnotationsWorkspace } from "@/features/docs/pdf-studio/components/remove-annotations/remove-annotations-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("remove-annotations", "workspace");

export default function RemoveAnnotationsPage() {
  return <RemoveAnnotationsWorkspace />;
}
