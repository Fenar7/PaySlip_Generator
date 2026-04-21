"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { validatePdfStudioFiles } from "@/features/docs/pdf-studio/lib/ingestion";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { convertPdfToGrayscale } from "@/features/docs/pdf-studio/utils/pdf-grayscale";
import { buildZip, downloadBlob, downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

export function GrayscaleWorkspace() {
  const analytics = usePdfStudioAnalytics("grayscale");
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<string>("");

  async function handleConvert() {
    if (files.length === 0) {
      setError("Upload at least one PDF before starting grayscale conversion.");
      return;
    }

    setProcessing(true);
    setError(null);
    analytics.trackStart({ fileCount: files.length, outputKind: files.length > 1 ? "zip" : "pdf" });

    try {
      const outputs: { name: string; data: Uint8Array }[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setProgress(`Converting ${file.name} (${index + 1} of ${files.length})`);
        const result = await convertPdfToGrayscale(new Uint8Array(await file.arrayBuffer()));
        if (!result.ok) {
          throw new Error(result.error);
        }
        outputs.push({
          name: buildPdfStudioOutputName({
            toolId: "grayscale",
            baseName: file.name.replace(/\.pdf$/i, ""),
            extension: "pdf",
          }),
          data: result.data,
        });
      }

      if (outputs.length === 1) {
        downloadPdfBytes(outputs[0].data, outputs[0].name);
      } else {
        downloadBlob(
          buildZip(outputs),
          buildPdfStudioOutputName({
            toolId: "grayscale",
            baseName: "grayscale-batch",
            extension: "zip",
          }),
        );
      }

      analytics.trackSuccess({ fileCount: files.length, outputKind: outputs.length > 1 ? "zip" : "pdf" });
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Grayscale conversion failed. Try fewer pages or smaller files.",
      );
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    } finally {
      setProcessing(false);
      setProgress("");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">Grayscale PDF</h1>
        <p className="mt-2 text-sm text-[#666]">
          Convert one or more PDFs to grayscale. This browser-safe export rebuilds pages as grayscale images, so links, forms, and selectable text become flattened.
        </p>
      </div>

      <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="application/pdf"
          multiple
          onChange={(event) => {
            const selection = Array.from(event.target.files ?? []);
            const validation = validatePdfStudioFiles("grayscale", selection, {
              currentFileCount: 0,
            });
            if (!validation.ok) {
              setError(validation.error);
              analytics.trackFail({ stage: "upload", reason: validation.reason });
              return;
            }
            setFiles(selection);
            setError(null);
            analytics.trackUpload({ fileCount: selection.length, totalBytes: validation.totalBytes });
          }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => inputRef.current?.click()}>
            Choose PDFs
          </Button>
          <Button type="button" variant="secondary" onClick={() => void handleConvert()} disabled={processing || files.length === 0}>
            {processing ? "Converting…" : files.length > 1 ? "Convert batch" : "Convert PDF"}
          </Button>
        </div>

        {files.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm text-[#1a1a1a]">
            {files.map((file) => (
              <li key={file.name} className="rounded-xl bg-[#f7f7f7] px-3 py-2">
                {file.name}
              </li>
            ))}
          </ul>
        ) : null}

        {progress ? <p className="mt-4 text-sm text-[#666]">{progress}</p> : null}
        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
