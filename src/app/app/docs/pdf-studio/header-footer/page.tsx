import type { Metadata } from "next";
import { HeaderFooterWorkspace } from "@/features/docs/pdf-studio/components/header-footer/header-footer-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("header-footer", "workspace");

export default function HeaderFooterPage() {
  return <HeaderFooterWorkspace />;
}
