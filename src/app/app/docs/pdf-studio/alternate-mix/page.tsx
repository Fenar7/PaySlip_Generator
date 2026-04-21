import type { Metadata } from "next";
import { AlternateMixWorkspace } from "@/features/docs/pdf-studio/components/alternate-mix/alternate-mix-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata(
  "alternate-mix",
  "workspace",
);

export default function AlternateMixPage() {
  return <AlternateMixWorkspace />;
}
