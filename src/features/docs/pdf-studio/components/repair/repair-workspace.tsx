"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { validatePdfStudioFiles } from "@/features/docs/pdf-studio/lib/ingestion";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

type RepairStatus = "idle" | "analyzing" | "repaired" | "partial" | "failed";

type RepairResult = {
  status: RepairStatus;
  message: string;
  originalSize: number;
  repairedSize: number;
  pageCount: number;
  repairedBytes: Uint8Array | null;
  filename: string;
};

const INITIAL_RESULT: RepairResult = {
  status: "idle",
  message: "",
  originalSize: 0,
  repairedSize: 0,
  pageCount: 0,
  repairedBytes: null,
  filename: "",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function StatusIcon({ status }: { status: RepairStatus }) {
  if (status === "analyzing") {
    return (
      <svg
        className="h-6 w-6 animate-spin text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  }
  if (status === "repaired") {
    return (
      <svg
        className="h-6 w-6 text-emerald-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (status === "partial") {
    return (
      <svg
        className="h-6 w-6 text-amber-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg
        className="h-6 w-6 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  return null;
}

export function RepairWorkspace() {
  const analytics = usePdfStudioAnalytics("repair");
  const [result, setResult] = useState<RepairResult>(INITIAL_RESULT);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const fileValidation = validatePdfStudioFiles("repair", [file]);
    if (!fileValidation.ok) {
      setResult({
        ...INITIAL_RESULT,
        status: "failed",
        message: fileValidation.error,
      });
      analytics.trackFail({ stage: "upload", message: fileValidation.error });
      return;
    }

    analytics.trackUpload({
      fileCount: 1,
      totalBytes: file.size,
    });
    analytics.trackStart({ totalBytes: file.size });
    setResult({
      ...INITIAL_RESULT,
      status: "analyzing",
      message: "Analyzing PDF structure…",
      originalSize: file.size,
      filename: file.name.replace(/\.pdf$/i, "") + "-repaired.pdf",
    });

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());

      // Attempt 1: Load and re-save with pdf-lib (lenient mode)
      try {
        const { PDFDocument } = await import("pdf-lib");
        const pdfDoc = await PDFDocument.load(bytes, {
          throwOnInvalidObject: false,
        });
        const savedBytes = await pdfDoc.save();
        const repairedBytes = new Uint8Array(savedBytes);

        setResult({
          status: "repaired",
          message:
            "PDF repaired successfully. Internal structure has been cleaned and re-built.",
          originalSize: file.size,
          repairedSize: repairedBytes.length,
          pageCount: pdfDoc.getPageCount(),
          repairedBytes,
          filename: file.name.replace(/\.pdf$/i, "") + "-repaired.pdf",
        });
        analytics.trackSuccess({
          status: "repaired",
          pageCount: pdfDoc.getPageCount(),
        });
        return;
      } catch {
        // pdf-lib failed — try pdfjs-dist fallback
      }

      // Attempt 2: Try pdfjs-dist for partial recovery
      try {
        const pdfjsLib = await import("pdfjs-dist");

        // Configure worker
        if (typeof window !== "undefined") {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }

        const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
        const pdfDoc = await loadingTask.promise;
        const pageCount = pdfDoc.numPages;

        // Re-export pages via pdf-lib
        const { PDFDocument } = await import("pdf-lib");
        const newDoc = await PDFDocument.create();

        for (let i = 1; i <= pageCount; i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 1 });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await page.render({ canvasContext: ctx, viewport } as any).promise;

          const pngDataUrl = canvas.toDataURL("image/png");
          const pngBase64 = pngDataUrl.split(",")[1];
          const pngBytes = Uint8Array.from(atob(pngBase64), (c) =>
            c.charCodeAt(0),
          );
          const pngImage = await newDoc.embedPng(pngBytes);
          const newPage = newDoc.addPage([viewport.width, viewport.height]);
          newPage.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height,
          });
        }

        const savedBytes = await newDoc.save();
        const repairedBytes = new Uint8Array(savedBytes);

        await pdfDoc.destroy();

        setResult({
          status: "partial",
          message: `Partial recovery: ${pageCount} page${pageCount !== 1 ? "s" : ""} extracted as images. Some text, links, or form data may be lost.`,
          originalSize: file.size,
          repairedSize: repairedBytes.length,
          pageCount,
          repairedBytes,
          filename: file.name.replace(/\.pdf$/i, "") + "-repaired.pdf",
        });
        analytics.trackSuccess({
          status: "partial",
          pageCount,
        });
        return;
      } catch {
        // Both methods failed
      }

      setResult({
        status: "failed",
        message:
          "This PDF is too damaged to repair. Consider using desktop tools like Adobe Acrobat or QPDF.",
        originalSize: file.size,
        repairedSize: 0,
        pageCount: 0,
        repairedBytes: null,
        filename: "",
      });
      analytics.trackFail({
        stage: "process",
        message:
          "This PDF is too damaged to repair. Consider using desktop tools like Adobe Acrobat or QPDF.",
      });
    } catch {
      setResult({
        status: "failed",
        message:
          "An unexpected error occurred while analyzing the PDF. Please try again with a different file.",
        originalSize: file.size,
        repairedSize: 0,
        pageCount: 0,
        repairedBytes: null,
        filename: "",
      });
      analytics.trackFail({
        stage: "process",
        message:
          "An unexpected error occurred while analyzing the PDF. Please try again with a different file.",
      });
    }
  }, [analytics]);

  const handleDownload = useCallback(() => {
    if (!result.repairedBytes) return;
    downloadPdfBytes(
      result.repairedBytes,
      buildPdfStudioOutputName({
        toolId: "repair",
        baseName: result.filename.replace(/\.pdf$/i, ""),
        extension: "pdf",
      }),
    );
  }, [result]);

  const handleReset = useCallback(() => {
    setResult(INITIAL_RESULT);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-[#1a1a1a]">
          Repair PDF
        </h1>
        <p className="mt-1 text-sm text-[#666]">
          Fix corrupted or damaged PDFs by rebuilding their internal structure.
        </p>
      </div>

      {result.status === "idle" && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e5e5e5] bg-white px-6 py-16 text-center shadow-sm"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-2xl shadow-sm">
            🔧
          </div>
          <p className="text-sm font-medium text-[#1a1a1a]">
            Drop your PDF here
          </p>
          <p className="mt-1 text-xs text-[#666]">PDF • Max 50MB</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => inputRef.current?.click()}
          >
            Browse Files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {result.status !== "idle" && (
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <StatusIcon status={result.status} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  result.status === "repaired" && "text-emerald-700",
                  result.status === "partial" && "text-amber-700",
                  result.status === "failed" && "text-red-700",
                  result.status === "analyzing" && "text-blue-700",
                )}
              >
                {result.status === "analyzing" && "Analyzing…"}
                {result.status === "repaired" && "Repair Successful"}
                {result.status === "partial" && "Partial Recovery"}
                {result.status === "failed" && "Repair Failed"}
              </p>
              <p className="mt-1 text-sm text-[#666]">{result.message}</p>
            </div>
          </div>

          {(result.status === "repaired" || result.status === "partial") && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <div className="grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <p className="font-medium text-[#1a1a1a]">
                    {formatBytes(result.originalSize)}
                  </p>
                  <p className="text-[#666]">Original</p>
                </div>
                <div>
                  <p className="font-medium text-[#1a1a1a]">
                    {formatBytes(result.repairedSize)}
                  </p>
                  <p className="text-[#666]">Repaired</p>
                </div>
                <div>
                  <p className="font-medium text-[#1a1a1a]">
                    {result.pageCount}
                  </p>
                  <p className="text-[#666]">
                    Page{result.pageCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            {result.repairedBytes && (
              <Button size="sm" onClick={handleDownload}>
                Download Repaired PDF
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleReset}>
              {result.status === "failed" ? "Try Another File" : "Reset"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
