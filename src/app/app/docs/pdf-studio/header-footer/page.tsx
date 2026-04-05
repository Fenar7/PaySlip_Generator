import type { Metadata } from "next";
import { HeaderFooterWorkspace } from "@/features/docs/pdf-studio/components/header-footer/header-footer-workspace";

export const metadata: Metadata = {
  title: "Header & Footer | PDF Studio",
};

export default function HeaderFooterPage() {
  return <HeaderFooterWorkspace />;
}
