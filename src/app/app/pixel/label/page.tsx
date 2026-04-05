import type { Metadata } from "next";
import { LabelWorkspace } from "@/features/pixel/components/label/label-workspace";

export const metadata: Metadata = { title: "Name & Date Labels | SW Pixel" };

export default function LabelPage() {
  return <LabelWorkspace />;
}
