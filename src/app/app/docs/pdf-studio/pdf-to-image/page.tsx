import type { Metadata } from "next";
import { PdfToImageWorkspace } from "@/features/docs/pdf-studio/components/pdf-to-image/pdf-to-image-workspace";

export const metadata: Metadata = {
  title: "PDF to Image | PDF Studio",
};

export default function PdfToImagePage() {
  return <PdfToImageWorkspace />;
}
