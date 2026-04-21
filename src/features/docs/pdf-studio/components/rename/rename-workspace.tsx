"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { validatePdfStudioFiles } from "@/features/docs/pdf-studio/lib/ingestion";
import { buildRenamedPdfFilename } from "@/features/docs/pdf-studio/utils/pdf-rename";
import { buildZip, downloadBlob, downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";
import type { PdfRenameRuleSettings } from "@/features/docs/pdf-studio/types";

const DEFAULT_RULES: PdfRenameRuleSettings = {
  prefix: "",
  suffix: "-final",
  replaceSpacesWith: "-",
  caseStyle: "original",
};

export function RenameWorkspace() {
  const analytics = usePdfStudioAnalytics("rename");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [rules, setRules] = useState<PdfRenameRuleSettings>(DEFAULT_RULES);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) {
        return;
      }

      const validation = validatePdfStudioFiles("rename", Array.from(fileList));
      if (!validation.ok) {
        setError(validation.error);
        analytics.trackFail({ stage: "upload", reason: validation.reason });
        return;
      }

      setFiles(validation.files);
      setError(null);
      analytics.trackUpload({
        fileCount: validation.files.length,
        totalBytes: validation.totalBytes,
      });
    },
    [analytics],
  );

  const renamedFiles = useMemo(
    () =>
      files.map((file) => ({
        original: file.name,
        renamed: buildRenamedPdfFilename(file.name, rules),
      })),
    [files, rules],
  );

  const handleDownload = useCallback(async () => {
    if (files.length === 0) {
      return;
    }

    setDownloading(true);
    setError(null);
    analytics.trackStart({ fileCount: files.length });

    try {
      const data = await Promise.all(
        files.map(async (file) => ({
          name: buildRenamedPdfFilename(file.name, rules),
          data: new Uint8Array(await file.arrayBuffer()),
        })),
      );

      if (data.length === 1) {
        downloadPdfBytes(data[0].data, data[0].name);
      } else {
        downloadBlob(buildZip(data), "renamed-pdfs.zip");
      }

      analytics.trackSuccess({ fileCount: files.length });
    } catch {
      setError("Could not rename these files. Please try again.");
      analytics.trackFail({ stage: "generate", reason: "processing-failed" });
    } finally {
      setDownloading(false);
    }
  }, [analytics, files, rules]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[360px,1fr]">
      <div className="space-y-4 rounded-2xl border border-[#e5e5e5] bg-white p-5">
        <div className="pdf-studio-tool-header">
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Rename Outputs</h1>
          <p className="mt-2 text-sm text-[#666]">
            Build explicit file naming rules before download. The PDF bytes stay unchanged.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ddd] bg-[#fafafa] px-4 py-8 text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-sm font-medium text-[#1a1a1a]">Upload PDFs</span>
          <span className="mt-1 text-xs text-[#666]">Up to 10 PDFs</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={(event) => handleFileSelect(event.target.files)}
        />

        <label className="block text-sm font-medium text-[#1a1a1a]">
          Prefix
          <input
            className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
            value={rules.prefix}
            onChange={(event) =>
              setRules((current) => ({ ...current, prefix: event.target.value }))
            }
          />
        </label>
        <label className="block text-sm font-medium text-[#1a1a1a]">
          Suffix
          <input
            className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
            value={rules.suffix}
            onChange={(event) =>
              setRules((current) => ({ ...current, suffix: event.target.value }))
            }
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Spaces
            <select
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={rules.replaceSpacesWith}
              onChange={(event) =>
                setRules((current) => ({
                  ...current,
                  replaceSpacesWith: event.target.value as PdfRenameRuleSettings["replaceSpacesWith"],
                }))
              }
            >
              <option value="-">Hyphen</option>
              <option value="_">Underscore</option>
              <option value="none">Keep spaces</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Case
            <select
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={rules.caseStyle}
              onChange={(event) =>
                setRules((current) => ({
                  ...current,
                  caseStyle: event.target.value as PdfRenameRuleSettings["caseStyle"],
                }))
              }
            >
              <option value="original">Original</option>
              <option value="lower">lowercase</option>
              <option value="upper">UPPERCASE</option>
              <option value="kebab">kebab-case</option>
              <option value="snake">snake_case</option>
            </select>
          </label>
        </div>

        <Button onClick={handleDownload} disabled={files.length === 0 || downloading}>
          {downloading ? "Preparing download..." : files.length > 1 ? "Download renamed ZIP" : "Download renamed PDF"}
        </Button>
      </div>

      <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Rename preview</h2>
        <div className="mt-4 space-y-3">
          {renamedFiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#ddd] bg-[#fafafa] px-4 py-8 text-sm text-[#666]">
              Add PDFs to preview the rename rules.
            </div>
          ) : (
            renamedFiles.map((item) => (
              <div key={item.original} className="rounded-xl border border-[#eee] bg-[#fafafa] px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-[#666]">Original</div>
                <div className="text-sm text-[#444]">{item.original}</div>
                <div className="mt-2 text-xs uppercase tracking-wide text-[#666]">Export</div>
                <div className="text-sm font-medium text-[#1a1a1a]">{item.renamed}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
