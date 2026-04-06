import type { Metadata } from "next";
import { ResizePagesWorkspace } from "@/features/docs/pdf-studio/components/resize-pages/resize-pages-workspace";

export const metadata: Metadata = {
  title: "Resize Pages | PDF Studio",
};

export default function ResizePagesPage() {
  return <ResizePagesWorkspace />;
}
