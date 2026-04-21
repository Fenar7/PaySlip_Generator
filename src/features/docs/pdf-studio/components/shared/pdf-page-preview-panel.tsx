"use client";

import { cn } from "@/lib/utils";
import type { PdfPageItem } from "@/features/docs/pdf-studio/utils/pdf-reader";

export function PdfPagePreviewPanel({
  pages,
  currentPage,
  onPageChange,
  overlay,
  className,
}: {
  pages: PdfPageItem[];
  currentPage: number;
  onPageChange: (pageIndex: number) => void;
  overlay?: React.ReactNode;
  className?: string;
}) {
  const current = pages[currentPage];

  if (!current) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl border border-[#e5e5e5] bg-[#f8f8f8] p-4">
        <div className="mb-3 flex items-center justify-between text-sm text-[#666]">
          <span>
            Page {currentPage + 1} of {pages.length}
          </span>
          <select
            className="rounded-lg border border-[#d0d0d0] bg-white px-3 py-1.5 text-sm"
            value={currentPage}
            onChange={(event) => onPageChange(Number(event.target.value))}
          >
            {pages.map((page, index) => (
              <option key={page.pageIndex} value={index}>
                Page {index + 1}
              </option>
            ))}
          </select>
        </div>

        <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-[#ddd] bg-white">
          <img
            src={current.previewUrl}
            alt={`PDF page ${currentPage + 1}`}
            className="block h-auto w-full"
          />
          {overlay}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {pages.map((page, index) => (
          <button
            key={`${page.pageIndex}-${page.previewUrl.length}`}
            className={cn(
              "min-w-[88px] overflow-hidden rounded-xl border bg-white text-left transition-colors",
              currentPage === index
                ? "border-[#1a1a1a] shadow-sm"
                : "border-[#ddd] hover:border-[#999]",
            )}
            onClick={() => onPageChange(index)}
          >
            <img
              src={page.previewUrl}
              alt={`Preview ${index + 1}`}
              className="h-24 w-full object-cover"
            />
            <div className="px-2 py-1.5 text-xs text-[#555]">Page {index + 1}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
