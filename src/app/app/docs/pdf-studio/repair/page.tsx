import type { Metadata } from "next";
import { RepairWorkspace } from "@/features/docs/pdf-studio/components/repair/repair-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("repair", "workspace");

export default function RepairPage() {
  return <RepairWorkspace />;
}
