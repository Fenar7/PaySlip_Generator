import type { Metadata } from "next";
import { ProtectUnlockWorkspace } from "@/features/docs/pdf-studio/components/protect/protect-unlock-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("protect", "workspace");

export default function ProtectPage() {
  return <ProtectUnlockWorkspace />;
}
