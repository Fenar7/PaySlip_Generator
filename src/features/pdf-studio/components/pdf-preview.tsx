"use client";

import { useEffect, useState } from "react";
import type { ImageItem, PageSettings, WatermarkSettings } from "@/features/pdf-studio/types";
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
  pageWidth: number;
  pageHeight: number;
};

const MARGIN_RATIOS = { none: 0, small: 0.024, medium: 0.048, large: 0.095 };

/**
 * Calculate watermark position for preview (CSS positioning)
 */
function calculatePreviewPosition(
  position: string,
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
  margin: number = 20
): { left: string; top: string; transformOrigin: string } {
  let left: string, top: string, transformOrigin: string;
  
  switch (position) {
    case 'top-left':
      left = `${margin}px`;
      top = `${margin}px`;
      transformOrigin = 'top left';
      break;
    case 'top-center':
      left = '50%';
      top = `${margin}px`;
      transformOrigin = 'top center';
      break;
    case 'top-right':
      left = `${containerWidth - margin}px`;
      top = `${margin}px`;
      transformOrigin = 'top right';
      break;
    case 'center-left':
      left = `${margin}px`;
      top = '50%';
      transformOrigin = 'center left';
      break;
    case 'center':
      left = '50%';
      top = '50%';
      transformOrigin = 'center';
      break;
    case 'center-right':
      left = `${containerWidth - margin}px`;
      top = '50%';
      transformOrigin = 'center right';
      break;
    case 'bottom-left':
      left = `${margin}px`;
      top = `${containerHeight - margin}px`;
      transformOrigin = 'bottom left';
      break;
    case 'bottom-center':
      left = '50%';
      top = `${containerHeight - margin}px`;
      transformOrigin = 'bottom center';
      break;
    case 'bottom-right':
      left = `${containerWidth - margin}px`;
      top = `${containerHeight - margin}px`;
      transformOrigin = 'bottom right';
      break;
    default:
      left = '50%';
      top = '50%';
      transformOrigin = 'center';
  }
  
  return { left, top, transformOrigin };
}

/**
 * Watermark overlay component for preview
 */
function WatermarkOverlay({
  watermark,
  containerWidth,
  containerHeight,
  pageIndex,
}: {
  watermark: WatermarkSettings;
  containerWidth: number;
  containerHeight: number;
  pageIndex: number;
}) {
  if (!watermark.enabled || watermark.type === 'none') return null;
  
  // Check scope - only show on first page if scope is 'first'
  if (watermark.scope === 'first' && pageIndex !== 0) return null;
  
  const position = calculatePreviewPosition(
    watermark.position,
    containerWidth,
    containerHeight,
    0, // Will be calculated dynamically by CSS
    0,
    Math.max(containerWidth * 0.03, 12) // Responsive margin
  );
  
  if (watermark.type === 'text' && watermark.text) {
    const scaleFactor = Math.min(containerWidth / 400, containerHeight / 566); // Based on A4 aspect ratio
    const fontSize = Math.max((watermark.text.fontSize || 24) * scaleFactor, 8);
    
    return (
      <div
        className="absolute pointer-events-none select-none"
        style={{
          left: position.left,
          top: position.top,
          transform: `translate(${position.left === '50%' ? '-50%' : position.left.includes('right') ? '-100%' : '0'}, ${position.top === '50%' ? '-50%' : position.top.includes('bottom') ? '-100%' : '0'}) rotate(${watermark.rotation || 0}deg)`,
          transformOrigin: position.transformOrigin,
          fontSize: `${fontSize}px`,
          color: watermark.text.color || '#999999',
          opacity: (watermark.text.opacity || 50) / 100,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}
      >
        {watermark.text.content}
      </div>
    );
  }
  
  if (watermark.type === 'image' && watermark.image && watermark.image.previewUrl) {
    const scaleFactor = Math.min(containerWidth / 400, containerHeight / 566);
    const scale = (watermark.image.scale || 30) / 100;
    const maxSize = Math.min(containerWidth, containerHeight) * 0.3 * scale * scaleFactor;
    
    return (
      <div
        className="absolute pointer-events-none select-none"
        style={{
          left: position.left,
          top: position.top,
          transform: `translate(${position.left === '50%' ? '-50%' : position.left.includes('right') ? '-100%' : '0'}, ${position.top === '50%' ? '-50%' : position.top.includes('bottom') ? '-100%' : '0'}) rotate(${watermark.rotation || 0}deg)`,
          transformOrigin: position.transformOrigin,
          opacity: (watermark.image.opacity || 50) / 100,
          zIndex: 10,
        }}
      >
        <img
          src={watermark.image.previewUrl}
          alt="Watermark"
          className="max-w-none"
          style={{
            maxWidth: `${maxSize}px`,
            maxHeight: `${maxSize}px`,
            width: 'auto',
            height: 'auto',
          }}
        />
      </div>
    );
  }
  
  return null;
}

function PreviewPage({
  data,
  index,
  watermark,
}: {
  data: PagePreviewData;
  index: number;
  watermark: WatermarkSettings;
}) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  const paddingPercent = `${(data.marginRatio * 100).toFixed(2)}%`;

  // Measure container size for watermark positioning
  useEffect(() => {
    if (!containerRef) return;
    
    const updateSize = () => {
      const rect = containerRef.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };
    
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={setContainerRef}
        className="relative w-full overflow-hidden rounded-[0.8rem] border border-[var(--border-soft)] bg-white shadow-[0_8px_24px_rgba(34,34,34,0.09)]"
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
          
          {/* Watermark overlay */}
          {containerSize.width > 0 && (
            <WatermarkOverlay
              watermark={watermark}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
              pageIndex={index}
            />
          )}
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
            pageWidth: pageDims.widthPt,
            pageHeight: pageDims.heightPt,
          });
        } catch {
          results.push({
            imageUrl: item.previewUrl,
            containerAspect: 297 / 210,
            objectFit: "contain",
            marginRatio: MARGIN_RATIOS[settings.margins],
            pageWidth: 595.28,
            pageHeight: 841.89,
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
          <PreviewPage 
            key={index} 
            data={page} 
            index={index}
            watermark={settings.watermark}
          />
        ))}
      </div>
    </div>
  );
}
