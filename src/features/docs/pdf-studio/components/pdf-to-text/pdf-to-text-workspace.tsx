"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { downloadBlob } from "@/features/docs/pdf-studio/utils/zip-builder";
import { extractPdfText } from "@/features/docs/pdf-studio/utils/pdf-text-extraction";
import type { PdfTextExtractionMode } from "@/features/docs/pdf-studio/types";

export function PdfToTextWorkspace() {
  const analytics = usePdfStudioAnalytics("pdf-to-text");
  const upload = useSinglePdfUpload("pdf-to-text", analytics);
  const [mode, setMode] = useState<PdfTextExtractionMode>("auto");
  const [running, setRunning] = useState(false);
  const [text, setText] = useState("");
  const [resolvedMode, setResolvedMode] = useState<"selectable" | "ocr" | null>(null);
  const [progress, setProgress] = useState("");

  async function handleExtract() {
    if (!upload.pdfBytes || !upload.file) {
      upload.setError("Upload a PDF before extracting text.");
      return;
    }

    setRunning(true);
    setProgress("");
    upload.setError(null);
    analytics.trackStart({ mode });

    try {
      const result = await extractPdfText(upload.pdfBytes, mode, (current, total) => {
        setProgress(`Running OCR on page ${current} of ${total}`);
      });
      setText(result.text);
      setResolvedMode(result.mode);
      analytics.trackSuccess({
        mode: result.mode,
        usedOcr: result.usedOcr,
        outputKind: "txt",
      });
    } catch (error) {
      upload.setError(
        error instanceof Error
          ? error.message
          : "Text extraction failed. Try selectable text mode or switch to OCR.",
      );
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    } finally {
      setRunning(false);
      setProgress("");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">PDF to Text</h1>
        <p className="mt-2 text-sm text-[#666]">
          Extract selectable text when it exists, or switch to OCR mode for scanned PDFs. Copy the preview or download a TXT file with deterministic naming.
        </p>
      </div>

      {!upload.file ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e5] bg-white px-6 py-14 text-center">
          <span className="text-sm font-medium text-[#1a1a1a]">Upload a PDF to extract text</span>
          <input
            className="hidden"
            type="file"
            accept="application/pdf"
            onChange={(event) => void upload.onFileSelect(event.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <div className="space-y-4 rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-[#f5f5f5] px-4 py-3 text-sm text-[#1a1a1a]">
              {upload.file.name}
            </div>
            <select
              className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm"
              value={mode}
              onChange={(event) => setMode(event.target.value as PdfTextExtractionMode)}
            >
              <option value="auto">Auto detect</option>
              <option value="selectable">Selectable text only</option>
              <option value="ocr">OCR fallback</option>
            </select>
            <Button onClick={() => void handleExtract()} disabled={running}>
              {running ? "Extracting…" : "Extract text"}
            </Button>
          </div>

          {progress ? <p className="text-sm text-[#666]">{progress}</p> : null}
          {upload.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {upload.error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">Text preview</p>
                <p className="text-xs text-[#666]">
                  {resolvedMode
                    ? `Resolved mode: ${resolvedMode === "ocr" ? "OCR-backed text" : "Selectable text"}`
                    : "Run extraction to preview the output."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!text}
                  onClick={() => void navigator.clipboard.writeText(text)}
                >
                  Copy text
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!text || !upload.file}
                  onClick={() =>
                    downloadBlob(
                      new Blob([text], { type: "text/plain;charset=utf-8" }),
                      buildPdfStudioOutputName({
                        toolId: "pdf-to-text",
                        baseName: upload.file!.name.replace(/\.pdf$/i, ""),
                        extension: "txt",
                      }),
                    )
                  }
                >
                  Download TXT
                </Button>
              </div>
            </div>
            <textarea
              className="min-h-[20rem] w-full rounded-xl border border-[#e5e5e5] bg-white p-3 text-sm text-[#1a1a1a]"
              value={text}
              readOnly
              placeholder="Extracted text will appear here."
            />
          </div>
        </div>
      )}
    </div>
  );
}
