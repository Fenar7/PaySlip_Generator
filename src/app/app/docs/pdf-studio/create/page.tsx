import type { Metadata } from "next";
import { PdfStudioWorkspace } from "@/features/docs/pdf-studio/components/pdf-studio-workspace";

export const metadata: Metadata = {
  title: "Create PDF | PDF Studio",
};

export default function CreatePdfPage() {
  return <PdfStudioWorkspace />;
}
