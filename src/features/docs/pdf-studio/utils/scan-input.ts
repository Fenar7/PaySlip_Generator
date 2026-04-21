import { classifyPdfStudioFile } from "@/features/docs/pdf-studio/lib/ingestion";
import type {
  ImageItem,
  PdfStudioFileClass,
  PdfStudioToolId,
} from "@/features/docs/pdf-studio/types";
import {
  getImageNaturalDimensions,
  loadImageFromFile,
} from "@/features/docs/pdf-studio/utils/image-processor";
import { readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";

export type ScanSourcePage = {
  id: string;
  name: string;
  previewUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  pageIndex: number;
  sourceName: string;
  fileClass: PdfStudioFileClass;
};

export async function loadScanSourcePages(
  file: File,
  toolId: PdfStudioToolId,
): Promise<
  | { ok: true; fileClass: PdfStudioFileClass; pages: ScanSourcePage[] }
  | { ok: false; error: string; reason: "unsupported-file-type" | "pdf-read-failed" | "page-limit-exceeded" }
> {
  const fileClass = classifyPdfStudioFile(file);
  if (fileClass === "pdf") {
    const readResult = await readPdfPages(file, { toolId });
    if (!readResult.ok) {
      return readResult;
    }

    return {
      ok: true,
      fileClass,
      pages: readResult.data.map((page) => ({
        id: `${file.name}-page-${page.pageIndex + 1}`,
        name: `${file.name.replace(/\.pdf$/iu, "")} — Page ${page.pageIndex + 1}`,
        previewUrl: page.previewUrl,
        width: page.widthPt,
        height: page.heightPt,
        sizeBytes: page.previewBytes,
        pageIndex: page.pageIndex,
        sourceName: file.name,
        fileClass,
      })),
    };
  }

  if (fileClass === "image") {
    const previewUrl = await loadImageFromFile(file);
    const dimensions = await getImageNaturalDimensions(previewUrl);
    return {
      ok: true,
      fileClass,
      pages: [
        {
          id: `${file.name}-image-0`,
          name: file.name,
          previewUrl,
          width: dimensions.width,
          height: dimensions.height,
          sizeBytes: file.size,
          pageIndex: 0,
          sourceName: file.name,
          fileClass,
        },
      ],
    };
  }

  return {
    ok: false,
    error: "Upload a PDF or supported image file.",
    reason: "unsupported-file-type",
  };
}

export function buildImageItemsFromScanPages(
  pages: ScanSourcePage[],
): ImageItem[] {
  return pages.map((page) => ({
    id: page.id,
    previewUrl: page.previewUrl,
    rotation: 0,
    name: page.name,
    sizeBytes: page.sizeBytes,
    ocrStatus: "pending",
  }));
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}
