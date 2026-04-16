import type { Metadata } from "next";
import { ConvertWorkspace } from "@/features/pixel/components/convert/convert-workspace";

export const metadata: Metadata = {
  title: "Image Converter — Free Online Tool | SW Pixel",
  description:
    "Convert images between JPEG, PNG, and WebP for free. No sign-up required. Batch convert with ZIP download.",
};

export default function PublicConvertPage() {
  return <ConvertWorkspace />;
}
