import type { Metadata } from "next";
import { AdjustWorkspace } from "@/features/pixel/components/adjust/adjust-workspace";

export const metadata: Metadata = { title: "Basic Adjustments | SW Pixel" };

export default function AdjustPage() {
  return <AdjustWorkspace />;
}
