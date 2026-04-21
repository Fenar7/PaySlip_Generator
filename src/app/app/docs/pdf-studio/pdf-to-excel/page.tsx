import type { Metadata } from "next";
import { PdfToExcelWorkspace } from "@/features/docs/pdf-studio/components/pdf-to-excel/pdf-to-excel-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";

export const metadata: Metadata = buildPdfStudioToolMetadata("pdf-to-excel", "workspace");

export default function PdfToExcelPage() {
  return <PdfToExcelWorkspace />;
}
