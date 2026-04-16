import type { Metadata } from "next";
import { ResizeWorkspace } from "@/features/pixel/components/resize/resize-workspace";

export const metadata: Metadata = {
  title: "Image Resizer — Free Online Tool | SW Pixel",
  description:
    "Resize images for free without signing up. Supports JPEG, PNG, WebP. Batch resize and ZIP download available.",
};

export default function PublicResizePage() {
  return <ResizeWorkspace />;
}
