import type { Metadata } from "next";
import { WordToPdfWorkspace } from "@/features/docs/pdf-studio/components/word-to-pdf/word-to-pdf-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("word-to-pdf", "workspace");

export default function WordToPdfPage() {
  return <WordToPdfWorkspace />;
}
