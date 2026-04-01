"use client";

import type { ImageItem } from "@/features/pdf-studio/types";
import { useMemo } from "react";

type OcrProgressPanelProps = {
  images: ImageItem[];
};

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-[var(--accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

export function OcrProgressPanel({ images }: OcrProgressPanelProps) {
  const { pending, processing, complete, error } = useMemo(() => {
    const counts = { pending: 0, processing: 0, complete: 0, error: 0 };
    images.forEach((item) => {
      if (item.ocrStatus === "pending") counts.pending++;
      else if (item.ocrStatus === "processing") counts.processing++;
      else if (item.ocrStatus === "complete") counts.complete++;
      else if (item.ocrStatus === "error") counts.error++;
    });
    return counts;
  }, [images]);

  const total = images.length;
  const inProgress = pending + processing;

  if (total === 0 || (inProgress === 0 && error === 0)) {
    return null;
  }

  return (
    <div className="rounded-[1.4rem] border border-[var(--border-soft)] bg-white/75 px-4 py-3 text-sm shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <p className="font-medium text-[var(--foreground)]">OCR Progress</p>
        <div className="flex items-center gap-2">
          {processing > 0 && (
            <span className="inline-flex items-center gap-1">
              <LoadingSpinner />
              {processing} Processing
            </span>
          )}
          {pending > 0 && (
            <span className="text-[var(--muted-foreground)]">{pending} Pending</span>
          )}
          {error > 0 && (
            <span className="text-[var(--danger)]">{error} Errors</span>
          )}
          {complete > 0 && (
            <span className="text-emerald-600">{complete} Complete</span>
          )}
        </div>
      </div>
    </div>
  );
}
