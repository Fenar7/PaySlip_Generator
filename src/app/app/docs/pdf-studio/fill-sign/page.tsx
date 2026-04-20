import type { Metadata } from "next";
import { FillSignWorkspace } from "@/features/docs/pdf-studio/components/fill-sign/fill-sign-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("fill-sign", "workspace");

export default function FillSignPage() {
  return <FillSignWorkspace />;
}
