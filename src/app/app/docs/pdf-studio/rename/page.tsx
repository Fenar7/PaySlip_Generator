import type { Metadata } from "next";
import { RenameWorkspace } from "@/features/docs/pdf-studio/components/rename/rename-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("rename", "workspace");

export default function RenamePage() {
  return <RenameWorkspace />;
}
