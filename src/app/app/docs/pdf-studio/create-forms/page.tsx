import type { Metadata } from "next";
import { CreateFormsWorkspace } from "@/features/docs/pdf-studio/components/create-forms/create-forms-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("create-forms", "workspace");

export default function CreateFormsPage() {
  return <CreateFormsWorkspace />;
}
