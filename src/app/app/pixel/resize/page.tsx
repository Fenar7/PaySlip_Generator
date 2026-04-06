import type { Metadata } from "next";
import { ResizeWorkspace } from "@/features/pixel/components/resize/resize-workspace";

export const metadata: Metadata = { title: "Resize & Compress | SW Pixel" };

export default function ResizePage() {
  return <ResizeWorkspace />;
}
