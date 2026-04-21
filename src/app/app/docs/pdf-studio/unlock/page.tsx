import type { Metadata } from "next";
import { UnlockWorkspace } from "@/features/docs/pdf-studio/components/unlock/unlock-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("unlock", "workspace");

export default function UnlockPdfPage() {
  return <UnlockWorkspace />;
}
