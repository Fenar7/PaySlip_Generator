import type { Metadata } from "next";
import { EditorWorkspace } from "@/features/docs/pdf-studio/components/editor/editor-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("editor", "workspace");

export default function PdfEditorPage() {
  return <EditorWorkspace />;
}
