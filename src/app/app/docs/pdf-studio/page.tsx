import type { Metadata } from "next";
import { PdfStudioHub } from "@/features/docs/pdf-studio/components/pdf-studio-hub";

export const metadata: Metadata = {
  title: "PDF Studio | Slipwise",
  description:
    "All-in-one PDF tools — create, merge, split, organize, and more. Free, private, browser-based.",
};

export default function PdfStudioPage() {
  return <PdfStudioHub />;
}
