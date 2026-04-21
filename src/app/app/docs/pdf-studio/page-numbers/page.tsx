import type { Metadata } from "next";
import { PageNumbersWorkspace } from "@/features/docs/pdf-studio/components/page-numbers/page-numbers-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("page-numbers", "workspace");

export default function PageNumbersPage() {
  return <PageNumbersWorkspace />;
}
