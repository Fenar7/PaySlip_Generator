import type { Metadata } from "next";
import { AdjustWorkspace } from "@/features/pixel/components/adjust/adjust-workspace";

export const metadata: Metadata = {
  title: "Image Adjuster — Free Online Tool | SW Pixel",
  description:
    "Adjust brightness, contrast, and saturation for free without signing up. JPEG and PNG output.",
};

export default function PublicAdjustPage() {
  return <AdjustWorkspace />;
}
