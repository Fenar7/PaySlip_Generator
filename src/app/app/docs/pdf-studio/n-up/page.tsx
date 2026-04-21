import type { Metadata } from "next";
import { NUpWorkspace } from "@/features/docs/pdf-studio/components/n-up/n-up-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("n-up", "workspace");

export default function NUpPage() {
  return <NUpWorkspace />;
}
