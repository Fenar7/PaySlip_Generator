"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { validatePdfStudioFiles } from "@/features/docs/pdf-studio/lib/ingestion";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import {
  buildRepairLog,
  repairPdfDocument,
  type PdfRepairResult,
  type RepairStatus,
} from "@/features/docs/pdf-studio/utils/pdf-repair";
import { downloadBlob, downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

type RepairWorkspaceState =
  | { status: "idle" }
  | { status: "analyzing"; filename: string; originalSize: number }
  | PdfRepairResult;

const INITIAL_STATE: RepairWorkspaceState = { status: "idle" };

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
      <svg className="h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
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
      <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  if (status === "partial") {
    return (
      <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    );
  }

  if (status === "failed") {
    return (
      <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  return null;
}

export function RepairWorkspace() {
  const analytics = usePdfStudioAnalytics("repair");
  const [result, setResult] = useState<RepairWorkspaceState>(INITIAL_STATE);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const fileValidation = validatePdfStudioFiles("repair", [file]);
      if (!fileValidation.ok) {
        setResult({
          status: "failed",
          message: fileValidation.error,
          originalSize: file.size,
          repairedSize: 0,
          pageCount: 0,
          repairedBytes: null,
          filename: file.name.replace(/\.pdf$/iu, "") + "-repaired",
          analysis: {
            byteLength: file.size,
            hasPdfHeader: false,
            hasEofMarker: false,
            hasXrefTable: false,
            hasTrailer: false,
            hasStartXref: false,
            truncationSuspected: true,
            warnings: [fileValidation.error],
          },
          method: "failed",
          log: fileValidation.error,
        });
        analytics.trackFail({ stage: "upload", reason: fileValidation.reason });
        return;
      }

      analytics.trackUpload({
        fileCount: 1,
        totalBytes: file.size,
      });
      analytics.trackStart({ totalBytes: file.size });
      setResult({
        status: "analyzing",
        filename: file.name.replace(/\.pdf$/iu, "") + "-repaired",
        originalSize: file.size,
      });

      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const repaired = await repairPdfDocument(file, bytes);
        setResult(repaired);

        if (repaired.status === "failed") {
          analytics.trackFail({
            stage: "process",
            reason:
              repaired.pageCount === 0 ? "no-recoverable-pages" : "processing-failed",
          });
          return;
        }

        analytics.trackSuccess({
          status: repaired.status,
          pageCount: repaired.pageCount,
          method: repaired.method,
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
          filename: file.name.replace(/\.pdf$/iu, "") + "-repaired",
          analysis: {
            byteLength: file.size,
            hasPdfHeader: false,
            hasEofMarker: false,
            hasXrefTable: false,
            hasTrailer: false,
            hasStartXref: false,
            truncationSuspected: true,
            warnings: ["Unexpected repair error."],
          },
          method: "failed",
          log: "Unexpected repair error.",
        });
        analytics.trackFail({
          stage: "process",
          reason: "processing-failed",
        });
      }
    },
    [analytics],
  );

  const handleDownloadPdf = useCallback(() => {
    if (
      result.status === "idle" ||
      result.status === "analyzing" ||
      !result.repairedBytes
    ) {
      return;
    }

    downloadPdfBytes(
      result.repairedBytes,
      buildPdfStudioOutputName({
        toolId: "repair",
        baseName: result.filename,
        extension: "pdf",
      }),
    );
  }, [result]);

  const handleDownloadLog = useCallback(() => {
    if (result.status === "idle" || result.status === "analyzing") {
      return;
    }

    downloadBlob(
      new Blob([buildRepairLog(result)], { type: "text/plain;charset=utf-8" }),
      buildPdfStudioOutputName({
        toolId: "repair",
        baseName: result.filename,
        variant: "log",
        extension: "txt",
      }),
    );
  }, [result]);

  const handleReset = useCallback(() => {
    setResult(INITIAL_STATE);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void handleFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="pdf-studio-tool-header mb-8">
        <h1 className="text-xl font-bold tracking-tight text-[#1a1a1a] sm:text-2xl">
          Repair PDF
        </h1>
        <p className="mt-1 text-sm text-[#666]">
          Analyze damaged PDFs, attempt a safe repair, and download a repair log
          that explains whether the output is repaired, partial, or failed.
        </p>
      </div>

      {result.status === "idle" && (
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e5e5e5] bg-white px-6 py-16 text-center shadow-sm"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-2xl shadow-sm">
            🔧
          </div>
          <p className="text-sm font-medium text-[#1a1a1a]">Drop your PDF here</p>
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
        <div className="space-y-6 rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
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
              <p className="mt-1 text-sm text-[#666]">
                {result.status === "analyzing"
                  ? "Inspecting the PDF structure and attempting safe recovery…"
                  : result.message}
              </p>
            </div>
          </div>

          {result.status !== "analyzing" ? (
            <>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="grid gap-4 text-xs sm:grid-cols-3">
                  <div>
                    <p className="font-medium text-[#1a1a1a]">
                      {formatBytes(result.originalSize)}
                    </p>
                    <p className="text-[#666]">Original size</p>
                  </div>
                  <div>
                    <p className="font-medium text-[#1a1a1a]">
                      {formatBytes(result.repairedSize)}
                    </p>
                    <p className="text-[#666]">Recovered size</p>
                  </div>
                  <div>
                    <p className="font-medium text-[#1a1a1a]">{result.pageCount}</p>
                    <p className="text-[#666]">Recovered pages</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4">
                  <h2 className="text-sm font-semibold text-[#1a1a1a]">
                    Damage analysis
                  </h2>
                  <div className="mt-3 grid gap-2 text-sm text-[#444]">
                    <p>Header marker: {result.analysis.hasPdfHeader ? "present" : "missing"}</p>
                    <p>EOF marker: {result.analysis.hasEofMarker ? "present" : "missing"}</p>
                    <p>xref marker: {result.analysis.hasXrefTable ? "present" : "missing"}</p>
                    <p>Trailer marker: {result.analysis.hasTrailer ? "present" : "missing"}</p>
                    <p>startxref marker: {result.analysis.hasStartXref ? "present" : "missing"}</p>
                    <p>
                      Truncation suspected:{" "}
                      {result.analysis.truncationSuspected ? "yes" : "no"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4">
                  <h2 className="text-sm font-semibold text-[#1a1a1a]">
                    Repair notes
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm text-[#444]">
                    {result.analysis.warnings.map((warning) => (
                      <li key={warning}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {result.repairedBytes ? (
                  <Button size="sm" onClick={handleDownloadPdf}>
                    Download {result.status === "partial" ? "Recovered PDF" : "Repaired PDF"}
                  </Button>
                ) : null}
                <Button variant="secondary" size="sm" onClick={handleDownloadLog}>
                  Download Repair Log
                </Button>
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  {result.status === "failed" ? "Try Another File" : "Reset"}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
