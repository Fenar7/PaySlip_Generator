import type { Metadata } from "next";
import { OrganizeWorkspace } from "@/features/docs/pdf-studio/components/organize/organize-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("organize", "workspace");

export default function OrganizePage() {
  return <OrganizeWorkspace />;
}
