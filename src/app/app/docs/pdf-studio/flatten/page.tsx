import type { Metadata } from "next";
import { FlattenWorkspace } from "@/features/docs/pdf-studio/components/flatten/flatten-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("flatten", "workspace");

export default function FlattenPage() {
  return <FlattenWorkspace />;
}
