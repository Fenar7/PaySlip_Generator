"use client";

import type { ImageItem } from "@/features/docs/pdf-studio/types";
import { useMemo } from "react";

type OcrProgressPanelProps = {
  images: ImageItem[];
  isOcrUnavailable?: boolean;
  onRetry?: (imageId: string) => void;
  onRetryAll?: () => void;
  onCancelOcr?: () => void;
};

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-[var(--accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

export function OcrProgressPanel({ images, isOcrUnavailable, onRetry, onRetryAll, onCancelOcr }: OcrProgressPanelProps) {
  const { pending, processing, complete, error, cancelled, errorImages, cancelledImages } = useMemo(() => {
    const counts = {
      pending: 0,
      processing: 0,
      complete: 0,
      error: 0,
      cancelled: 0,
      errorImages: [] as ImageItem[],
      cancelledImages: [] as ImageItem[],
    };
    images.forEach((item) => {
      if (item.ocrStatus === "pending") counts.pending++;
      else if (item.ocrStatus === "processing") counts.processing++;
      else if (item.ocrStatus === "complete") counts.complete++;
      else if (item.ocrStatus === "error") {
        counts.error++;
        counts.errorImages.push(item);
      } else if (item.ocrStatus === "cancelled") {
        counts.cancelled++;
        counts.cancelledImages.push(item);
      }
    });
    return counts;
  }, [images]);

  const total = images.length;
  const inProgress = pending + processing;
  const retryableCount = error + cancelled;
  const retryableImages = [...errorImages, ...cancelledImages];

  // Show unavailable banner regardless of image state
  if (isOcrUnavailable) {
    return (
      <div className="rounded-[1.4rem] border border-orange-200 bg-orange-50/80 px-4 py-3 text-sm shadow-[var(--shadow-soft)]">
        <p className="font-medium text-orange-700">OCR unavailable</p>
        <p className="mt-0.5 text-orange-600">
          OCR could not start in this browser. Refresh the page to try again. Your PDF will still be generated, but without searchable text.
        </p>
      </div>
    );
  }

  if (total === 0 || (inProgress === 0 && retryableCount === 0)) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="rounded-[1.4rem] border border-[var(--border-soft)] bg-white/75 px-4 py-3 text-sm shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-[var(--foreground)]">OCR Progress</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
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
              <span className="text-[var(--danger)]">{error} Failed</span>
            )}
            {cancelled > 0 && (
              <span className="text-[var(--muted-foreground)]">{cancelled} Cancelled</span>
            )}
            {complete > 0 && (
              <span className="text-emerald-600">{complete} Complete</span>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {inProgress > 0 && (
            <p className="flex-1 text-[0.72rem] text-[var(--muted-foreground)]">
              English OCR runs locally in your browser. Large images may take longer.
            </p>
          )}
          {inProgress > 0 && onCancelOcr && (
            <button
              type="button"
              onClick={onCancelOcr}
              className="shrink-0 rounded-md border border-[var(--border-soft)] bg-white px-2.5 py-1 text-[0.72rem] font-medium text-[var(--foreground-soft)] hover:bg-[var(--surface-soft)] transition-colors"
            >
              Cancel OCR
            </button>
          )}
        </div>
      </div>

      {/* Per-image retry for failed / cancelled OCR */}
      {retryableCount > 0 && (
        <div className="rounded-[1.2rem] border border-red-100 bg-red-50/60 px-4 py-3 text-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-medium text-red-700">
              {retryableCount} image{retryableCount > 1 ? "s" : ""} need{retryableCount === 1 ? "s" : ""} OCR
            </p>
            {retryableCount > 1 && onRetryAll && (
              <button
                type="button"
                onClick={onRetryAll}
                className="shrink-0 rounded-md bg-red-600 px-2.5 py-1 text-[0.72rem] font-medium text-white hover:bg-red-700 transition-colors"
              >
                Retry all
              </button>
            )}
          </div>
          {onRetry && (
            <ul className="space-y-1.5">
              {retryableImages.map((img) => (
                <li key={img.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[0.78rem] text-red-600" title={img.ocrErrorMessage ?? (img.ocrStatus === "cancelled" ? "OCR was cancelled" : "OCR failed")}>
                    {img.name} — {img.ocrStatus === "cancelled" ? "Cancelled" : (img.ocrErrorMessage ?? "OCR failed")}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRetry(img.id)}
                    className="shrink-0 rounded-md bg-red-100 px-2 py-0.5 text-[0.72rem] font-medium text-red-700 hover:bg-red-200 transition-colors"
                  >
                    Retry
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
