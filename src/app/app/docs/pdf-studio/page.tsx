import type { Metadata } from "next";
import { PdfStudioWorkspace } from "@/features/docs/pdf-studio/components/pdf-studio-workspace";

export const metadata: Metadata = {
  title: "PDF Studio",
  description:
    "Convert images to PDF. Upload up to 30 images, arrange them, and download a clean merged PDF.",
};

export default function PdfStudioPage() {
  return <PdfStudioWorkspace />;
}
