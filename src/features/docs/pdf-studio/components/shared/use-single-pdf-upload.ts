"use client";

import { useCallback, useState } from "react";
import type { PdfStudioToolId } from "@/features/docs/pdf-studio/types";
import { validatePdfStudioFiles } from "@/features/docs/pdf-studio/lib/ingestion";
import { readPdfPages, type PdfPageItem } from "@/features/docs/pdf-studio/utils/pdf-reader";
import type { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";

type AnalyticsInstance = ReturnType<typeof usePdfStudioAnalytics>;

export function useSinglePdfUpload(
  toolId: PdfStudioToolId,
  analytics: AnalyticsInstance,
) {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<PdfPageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileSelect = useCallback(
    async (nextFile: File | null) => {
      if (!nextFile) {
        return false;
      }

      const validation = validatePdfStudioFiles(toolId, [nextFile]);
      if (!validation.ok) {
        setError(validation.error);
        analytics.trackFail({ stage: "upload", reason: validation.reason });
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const bytes = new Uint8Array(await nextFile.arrayBuffer());
        const readResult = await readPdfPages(nextFile, { toolId });
        if (!readResult.ok) {
          setError(readResult.error);
          analytics.trackFail({ stage: "upload", reason: readResult.reason });
          setFile(null);
          setPdfBytes(null);
          setPages([]);
          return false;
        }

        setFile(nextFile);
        setPdfBytes(bytes);
        setPages(readResult.data);
        analytics.trackUpload({
          fileCount: 1,
          pageCount: readResult.data.length,
          totalBytes: nextFile.size,
        });
        return true;
      } catch {
        setError("Unable to read this PDF. Please verify the file is valid and try again.");
        analytics.trackFail({ stage: "upload", reason: "pdf-read-failed" });
        setFile(null);
        setPdfBytes(null);
        setPages([]);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [analytics, toolId],
  );

  return {
    file,
    pdfBytes,
    pages,
    loading,
    error,
    setError,
    setFile,
    setPdfBytes,
    setPages,
    onFileSelect,
  };
}
