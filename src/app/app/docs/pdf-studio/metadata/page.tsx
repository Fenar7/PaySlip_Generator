import type { Metadata } from "next";
import { MetadataWorkspace } from "@/features/docs/pdf-studio/components/metadata/metadata-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("metadata", "workspace");

export default function EditMetadataPage() {
  return <MetadataWorkspace />;
}
