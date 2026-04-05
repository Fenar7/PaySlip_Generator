import type { Metadata } from "next";
import { OrganizeWorkspace } from "@/features/docs/pdf-studio/components/organize/organize-workspace";

export const metadata: Metadata = {
  title: "Organize Pages | PDF Studio",
};

export default function OrganizePage() {
  return <OrganizeWorkspace />;
}
