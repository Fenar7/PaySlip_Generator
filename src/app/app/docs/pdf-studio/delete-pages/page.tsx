import type { Metadata } from "next";
import { DeletePagesWorkspace } from "@/features/docs/pdf-studio/components/delete-pages/delete-pages-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("delete-pages", "workspace");

export default function DeletePagesPage() {
  return <DeletePagesWorkspace />;
}
