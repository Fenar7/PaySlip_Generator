import type { Metadata } from "next";
import { CompressWorkspace } from "@/features/pixel/components/compress/compress-workspace";

export const metadata: Metadata = {
  title: "Image Compressor — Free Online Tool | SW Pixel",
  description:
    "Compress JPEG, PNG, and WebP images for free. Reduce file size without visible quality loss. Batch ZIP download.",
};

export default function PublicCompressPage() {
  return <CompressWorkspace />;
}
