export type RepairStatus = "idle" | "analyzing" | "repaired" | "partial" | "failed";

export type PdfRepairAnalysis = {
  byteLength: number;
  hasPdfHeader: boolean;
  hasEofMarker: boolean;
  hasXrefTable: boolean;
  hasTrailer: boolean;
  hasStartXref: boolean;
  truncationSuspected: boolean;
  warnings: string[];
};

export type PdfRepairResult = {
  status: Exclude<RepairStatus, "idle" | "analyzing">;
  message: string;
  originalSize: number;
  repairedSize: number;
  pageCount: number;
  repairedBytes: Uint8Array | null;
  filename: string;
  analysis: PdfRepairAnalysis;
  method: "structure-rebuild" | "raster-salvage" | "failed";
  log: string;
};

function decodeAscii(bytes: Uint8Array) {
  return new TextDecoder("latin1").decode(bytes);
}

function summarizeWarnings(analysis: PdfRepairAnalysis) {
  const warnings: string[] = [];

  if (!analysis.hasPdfHeader) {
    warnings.push("Missing PDF header marker.");
  }
  if (!analysis.hasEofMarker) {
    warnings.push("Missing EOF marker.");
  }
  if (!analysis.hasXrefTable) {
    warnings.push("Cross-reference table marker not found.");
  }
  if (!analysis.hasTrailer) {
    warnings.push("Trailer marker not found.");
  }
  if (!analysis.hasStartXref) {
    warnings.push("startxref marker not found.");
  }
  if (!warnings.length) {
    warnings.push("No obvious structural markers were missing.");
  }

  return warnings;
}

export function analyzePdfDamage(bytes: Uint8Array): PdfRepairAnalysis {
  const head = decodeAscii(bytes.slice(0, Math.min(bytes.length, 1024)));
  const tail = decodeAscii(bytes.slice(Math.max(0, bytes.length - 4096)));
  const combined = `${head}\n${tail}`;

  const analysis: PdfRepairAnalysis = {
    byteLength: bytes.length,
    hasPdfHeader: /%PDF-\d\.\d/u.test(head),
    hasEofMarker: /%%EOF/u.test(tail),
    hasXrefTable: /\bxref\b/u.test(combined),
    hasTrailer: /\btrailer\b/u.test(combined),
    hasStartXref: /\bstartxref\b/u.test(combined),
    truncationSuspected: false,
    warnings: [],
  };

  analysis.truncationSuspected =
    !analysis.hasEofMarker || !analysis.hasStartXref;
  analysis.warnings = summarizeWarnings(analysis);
  return analysis;
}

async function validateRecoveredPdf(bytes: Uint8Array) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes, { throwOnInvalidObject: false });
  return pdf.getPageCount();
}

async function attemptStructureRepair(
  bytes: Uint8Array,
): Promise<{ repairedBytes: Uint8Array; pageCount: number }> {
  const { PDFDocument } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.load(bytes, {
    throwOnInvalidObject: false,
  });
  const savedBytes = new Uint8Array(await pdfDoc.save());
  const pageCount = await validateRecoveredPdf(savedBytes);
  return { repairedBytes: savedBytes, pageCount };
}

async function attemptRasterSalvage(
  bytes: Uint8Array,
): Promise<{
  repairedBytes: Uint8Array;
  pageCount: number;
  recoveredPages: number;
  failedPages: number[];
}> {
  const pdfjsLib = await import("pdfjs-dist");
  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const sourcePdf = await loadingTask.promise;
  const { PDFDocument } = await import("pdf-lib");
  const outputPdf = await PDFDocument.create();
  const failedPages: number[] = [];
  let recoveredPages = 0;

  try {
    for (let pageNumber = 1; pageNumber <= sourcePdf.numPages; pageNumber += 1) {
      let page = null;
      try {
        page = await sourcePdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.25 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Canvas context unavailable");
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((value) => resolve(value), "image/png");
        });
        if (!blob) {
          throw new Error("Failed to encode the recovered page.");
        }

        const pngBytes = new Uint8Array(await blob.arrayBuffer());
        const pngImage = await outputPdf.embedPng(pngBytes);
        const newPage = outputPdf.addPage([viewport.width, viewport.height]);
        newPage.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });
        recoveredPages += 1;
      } catch {
        failedPages.push(pageNumber);
      } finally {
        page?.cleanup();
      }
    }
  } finally {
    try {
      await sourcePdf.destroy();
    } catch {
      // Best-effort cleanup only.
    }
    try {
      await loadingTask.destroy();
    } catch {
      // Best-effort cleanup only.
    }
  }

  if (recoveredPages === 0) {
    throw new Error("No recoverable pages were found.");
  }

  const repairedBytes = new Uint8Array(await outputPdf.save());
  const pageCount = await validateRecoveredPdf(repairedBytes);
  return {
    repairedBytes,
    pageCount,
    recoveredPages,
    failedPages,
  };
}

export function buildRepairLog(result: PdfRepairResult) {
  const lines = [
    "PDF Studio Repair Log",
    `Status: ${result.status}`,
    `Method: ${result.method}`,
    `Original size: ${result.originalSize} bytes`,
    `Recovered size: ${result.repairedSize} bytes`,
    `Recovered pages: ${result.pageCount}`,
    `Header present: ${result.analysis.hasPdfHeader ? "yes" : "no"}`,
    `EOF marker present: ${result.analysis.hasEofMarker ? "yes" : "no"}`,
    `xref present: ${result.analysis.hasXrefTable ? "yes" : "no"}`,
    `trailer present: ${result.analysis.hasTrailer ? "yes" : "no"}`,
    `startxref present: ${result.analysis.hasStartXref ? "yes" : "no"}`,
    `Truncation suspected: ${result.analysis.truncationSuspected ? "yes" : "no"}`,
    "Warnings:",
    ...result.analysis.warnings.map((warning) => `- ${warning}`),
    "",
    "Outcome message:",
    result.message,
  ];

  return lines.join("\n");
}

export async function repairPdfDocument(
  file: File,
  bytes: Uint8Array,
): Promise<PdfRepairResult> {
  const analysis = analyzePdfDamage(bytes);
  const filename = file.name.replace(/\.pdf$/iu, "") + "-repaired";

  try {
    const repaired = await attemptStructureRepair(bytes);
    const result: PdfRepairResult = {
      status: "repaired",
      message:
        "PDF structure was rebuilt successfully. Review the repair log if the source file was already showing corruption warnings.",
      originalSize: file.size,
      repairedSize: repaired.repairedBytes.length,
      pageCount: repaired.pageCount,
      repairedBytes: repaired.repairedBytes,
      filename,
      analysis,
      method: "structure-rebuild",
      log: "",
    };
    result.log = buildRepairLog(result);
    return result;
  } catch {
    // Fall through to raster salvage.
  }

  try {
    const salvaged = await attemptRasterSalvage(bytes);
    const partialResult: PdfRepairResult = {
      status: "partial",
      message:
        salvaged.failedPages.length > 0
          ? `Partial recovery succeeded. ${salvaged.recoveredPages} page${salvaged.recoveredPages === 1 ? "" : "s"} were rebuilt as images and ${salvaged.failedPages.length} page${salvaged.failedPages.length === 1 ? "" : "s"} could not be recovered.`
          : `Partial recovery succeeded. ${salvaged.recoveredPages} page${salvaged.recoveredPages === 1 ? "" : "s"} were rebuilt as images. Text, links, forms, and annotations are flattened in this output.`,
      originalSize: file.size,
      repairedSize: salvaged.repairedBytes.length,
      pageCount: salvaged.pageCount,
      repairedBytes: salvaged.repairedBytes,
      filename,
      analysis: {
        ...analysis,
        warnings: [
          ...analysis.warnings,
          "Raster salvage was used. Text, forms, links, and annotations are flattened in the recovered output.",
        ],
      },
      method: "raster-salvage",
      log: "",
    };
    partialResult.log = buildRepairLog(partialResult);
    return partialResult;
  } catch (salvageError) {
    const failedResult: PdfRepairResult = {
      status: "failed",
      message:
        salvageError instanceof Error &&
        salvageError.message === "No recoverable pages were found."
          ? "This PDF is too damaged to recover safely. No valid pages could be rendered."
          : "This PDF is too damaged to repair safely in the browser. Try a desktop repair tool for deeper recovery.",
      originalSize: file.size,
      repairedSize: 0,
      pageCount: 0,
      repairedBytes: null,
      filename,
      analysis: {
        ...analysis,
        warnings: [
          ...analysis.warnings,
          "Browser repair exhausted both structure rebuild and raster salvage.",
        ],
      },
      method: "failed",
      log: "",
    };
    failedResult.log = buildRepairLog(failedResult);
    return failedResult;
  }
}
