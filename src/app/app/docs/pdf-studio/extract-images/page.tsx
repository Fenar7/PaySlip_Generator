import type { Metadata } from "next";
import { ExtractImagesWorkspace } from "@/features/docs/pdf-studio/components/extract-images/extract-images-workspace";

export const metadata: Metadata = {
  title: "Extract Images | PDF Studio",
};

export default function ExtractImagesPage() {
  return <ExtractImagesWorkspace />;
}
