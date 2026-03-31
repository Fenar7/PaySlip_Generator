import type { Metadata } from "next";
import { PdfStudioWorkspace } from "@/features/pdf-studio/components/pdf-studio-workspace";

export const metadata: Metadata = {
  title: "PDF Studio — Slipwise",
  description:
    "Convert images to PDF in your browser. Upload up to 30 images, arrange them, configure page settings, and download a clean merged PDF.",
};

export default function PdfStudioPage() {
  return <PdfStudioWorkspace />;
}
