import type { Metadata } from "next";
import { PrintLayoutWorkspace } from "@/features/pixel/components/print-layout/print-layout-workspace";

export const metadata: Metadata = { title: "Print Layout | SW Pixel" };

export default function PrintLayoutPage() {
  return <PrintLayoutWorkspace />;
}
