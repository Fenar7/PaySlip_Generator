"use client";

import { useEffect, useState } from "react";
import type { ImageItem, PageSettings } from "@/features/pdf-studio/types";
import {
  generateThumbnailDataUrl,
  getEffectivePageDimensions,
  getImageNaturalDimensions,
  getProcessedImageDimensions,
} from "@/features/pdf-studio/utils/image-processor";
import { cn } from "@/lib/utils";

type PdfPreviewProps = {
  images: ImageItem[];
  settings: PageSettings;
};

type PagePreviewData = {
  imageUrl: string;
  containerAspect: number;
  objectFit: "contain" | "cover" | "none";
  marginRatio: number;
};

const MARGIN_RATIOS = { none: 0, small: 0.024, medium: 0.048, large: 0.095 };

function PreviewPage({
  data,
  index,
}: {
  data: PagePreviewData;
  index: number;
}) {
  const paddingPercent = `${(data.marginRatio * 100).toFixed(2)}%`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-full overflow-hidden rounded-[0.8rem] border border-[var(--border-soft)] bg-white shadow-[0_8px_24px_rgba(34,34,34,0.09)]"
        style={{ aspectRatio: String(1 / data.containerAspect) }}
      >
        <div
          className="relative h-full w-full"
          style={{ padding: paddingPercent }}
        >
          <img
            src={data.imageUrl}
            alt={`Page ${index + 1}`}
            className="h-full w-full"
            style={{
              objectFit: data.objectFit,
            }}
            draggable={false}
          />
        </div>
      </div>
      <p className="text-[0.68rem] font-medium text-[var(--muted-foreground)]">
        Page {index + 1}
      </p>
    </div>
  );
}

export function PdfPreview({ images, settings }: PdfPreviewProps) {
  const [pages, setPages] = useState<PagePreviewData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function buildPages() {
      if (images.length === 0) {
        if (!cancelled) {
          setPages([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      const results: PagePreviewData[] = [];

      for (const item of images) {
        if (cancelled) break;

        try {
          const dims = await getImageNaturalDimensions(item.previewUrl);
          const previewUrl = await generateThumbnailDataUrl(item.previewUrl, item.rotation, item.crop, 1200);
          const effectiveDims = getProcessedImageDimensions(dims, item.rotation, item.crop);

          const pageDims = getEffectivePageDimensions(
            settings,
            effectiveDims.width,
            effectiveDims.height,
          );

          const containerAspect = pageDims.heightPt / pageDims.widthPt;
          const marginRatio = MARGIN_RATIOS[settings.margins];

          const objectFit: "contain" | "cover" | "none" =
            settings.fitMode === "contain"
              ? "contain"
              : settings.fitMode === "cover"
                ? "cover"
                : "none";

          results.push({
            imageUrl: previewUrl,
            containerAspect,
            objectFit,
            marginRatio,
          });
        } catch {
          results.push({
            imageUrl: item.previewUrl,
            containerAspect: 297 / 210,
            objectFit: "contain",
            marginRatio: MARGIN_RATIOS[settings.margins],
          });
        }
      }

      if (!cancelled) {
        setPages(results);
        setIsLoading(false);
      }
    }

    void buildPages();

    return () => {
      cancelled = true;
    };
  }, [images, settings]);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-[1.6rem] border border-dashed border-[var(--border-strong)] bg-[rgba(248,241,235,0.4)] px-6 py-16 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[var(--border-soft)] bg-white text-[var(--muted-foreground)] shadow-[0_8px_20px_rgba(34,34,34,0.05)]">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>
        <div>
          <p className="text-[0.95rem] font-medium text-[var(--foreground-soft)]">No images yet</p>
          <p className="mt-1 text-[0.82rem] text-[var(--muted-foreground)]">
            Upload images to preview your document here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          {pages.length} {pages.length === 1 ? "page" : "pages"}
        </p>
        {isLoading ? (
          <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--muted-foreground)]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
            Updating preview
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "grid gap-4 transition-opacity",
          isLoading ? "opacity-60" : "opacity-100",
          pages.length === 1
            ? "grid-cols-1 max-w-[220px]"
            : "grid-cols-2 sm:grid-cols-3",
        )}
      >
        {pages.map((page, index) => (
          <PreviewPage key={index} data={page} index={index} />
        ))}
      </div>
    </div>
  );
}
