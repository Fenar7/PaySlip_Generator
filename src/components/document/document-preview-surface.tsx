"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  A4_DOCUMENT_HEIGHT,
  PREVIEW_DOCUMENT_FRAME_HEIGHT,
  PREVIEW_DOCUMENT_FRAME_WIDTH,
  PREVIEW_VIEWPORT_HORIZONTAL_GUTTER,
} from "@/components/document/document-constants";

type DocumentPreviewSurfaceProps = {
  title: string;
  templateName: string;
  children: ReactNode;
};

export function DocumentPreviewSurface({
  title,
  templateName,
  children,
}: DocumentPreviewSurfaceProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentMeasureRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(PREVIEW_DOCUMENT_FRAME_WIDTH);
  const [contentHeight, setContentHeight] = useState(PREVIEW_DOCUMENT_FRAME_HEIGHT);
  const [isCompactPreview, setIsCompactPreview] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const updateViewportMetrics = () => {
      const compact = viewport.clientWidth < 640;
      setIsCompactPreview(compact);
      setViewportWidth(viewport.clientWidth);
    };

    updateViewportMetrics();

    const viewportObserver = new ResizeObserver(() => {
      updateViewportMetrics();
    });

    viewportObserver.observe(viewport);

    return () => {
      viewportObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const contentMeasure = contentMeasureRef.current;

    if (!contentMeasure) {
      return;
    }

    let frameId = 0;

    const updateContentHeight = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const nextHeight = Math.max(
          PREVIEW_DOCUMENT_FRAME_HEIGHT,
          contentMeasure.scrollHeight + 2,
        );

        setContentHeight((currentHeight) =>
          currentHeight === nextHeight ? currentHeight : nextHeight,
        );
      });
    };

    updateContentHeight();

    const contentObserver = new ResizeObserver(() => {
      updateContentHeight();
    });

    contentObserver.observe(contentMeasure);

    return () => {
      contentObserver.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [children]);

  const scale = useMemo(() => {
    const gutter = isCompactPreview ? 4 : PREVIEW_VIEWPORT_HORIZONTAL_GUTTER;
    const availableWidth = Math.max(0, viewportWidth - gutter);
    return Math.min(1, availableWidth / PREVIEW_DOCUMENT_FRAME_WIDTH);
  }, [isCompactPreview, viewportWidth]);

  const scaledHeight = useMemo(
    () => Math.max(isCompactPreview ? 220 : 420, Math.ceil(contentHeight * scale)),
    [contentHeight, isCompactPreview, scale],
  );
  const scaledWidth = useMemo(
    () => Math.ceil(PREVIEW_DOCUMENT_FRAME_WIDTH * scale),
    [scale],
  );

  return (
    <div
      className={
        isCompactPreview
          ? "relative overflow-hidden rounded-[0.95rem] border border-[rgba(34,34,34,0.08)] bg-[linear-gradient(180deg,#fbf7f2,#f2ece6)] p-1 shadow-[0_14px_30px_rgba(34,34,34,0.06)]"
          : "relative overflow-hidden rounded-[1.9rem] border border-[rgba(34,34,34,0.08)] bg-[linear-gradient(180deg,rgba(247,241,235,0.82),rgba(255,255,255,0.98))] p-3 shadow-[var(--shadow-card)] sm:p-4"
      }
    >
      <div className={isCompactPreview ? "relative space-y-2" : "relative space-y-4"}>
        {isCompactPreview ? (
          <div className="flex items-center justify-between rounded-[0.8rem] border border-[rgba(34,34,34,0.08)] bg-white/94 px-2.5 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)] shadow-[0_8px_18px_rgba(34,34,34,0.04)]">
            <span className="truncate">Live preview</span>
            <span className="rounded-full border border-[var(--border-soft)] px-2 py-0.5 text-[0.58rem]">
              A4
            </span>
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-[rgba(34,34,34,0.08)] bg-white/92 px-4 py-4 shadow-[0_10px_24px_rgba(34,34,34,0.04)]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[rgba(248,113,113,0.85)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[rgba(251,191,36,0.85)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[rgba(74,222,128,0.85)]" />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                  Live preview
                </p>
                <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                  {title} · {templateName}
                </p>
              </div>
              <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
                A4 workspace
              </span>
            </div>
          </div>
        )}

        <div
          ref={viewportRef}
          data-testid="document-preview-viewport"
          className={
            isCompactPreview
              ? "overflow-hidden rounded-[0.85rem] border border-[rgba(34,34,34,0.08)] bg-white"
              : "overflow-hidden rounded-[1.7rem] border border-[rgba(34,34,34,0.08)] bg-[linear-gradient(180deg,#fbf7f2,#f1ebe4)] p-2.5 sm:p-3.5"
          }
        >
          {!isCompactPreview ? (
            <div className="mb-3 flex items-center justify-between rounded-[1rem] border border-[rgba(34,34,34,0.08)] bg-white/88 px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              <span>Document canvas</span>
              <span>Synced</span>
            </div>
          ) : null}

          {isCompactPreview ? (
            <div
              className="relative mx-auto max-w-full overflow-hidden rounded-[0.7rem] border border-[rgba(34,34,34,0.08)] bg-white shadow-[0_14px_28px_rgba(34,34,34,0.08)]"
              style={{
                width: `${scaledWidth}px`,
                height: `${Math.ceil(scaledHeight)}px`,
              }}
            >
              <div
                className="absolute left-0 top-0"
                style={{
                  width: `${PREVIEW_DOCUMENT_FRAME_WIDTH - 2}px`,
                  minHeight: `${A4_DOCUMENT_HEIGHT}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <div ref={contentMeasureRef}>{children}</div>
              </div>
            </div>
          ) : (
            <div
              className="mx-auto flex max-w-full justify-center"
              style={{
                width: `${scaledWidth}px`,
                minHeight: `${Math.ceil(scaledHeight)}px`,
              }}
            >
              <div
                className="overflow-hidden rounded-[1.25rem] border border-[rgba(34,34,34,0.08)] bg-white shadow-[0_28px_52px_rgba(34,34,34,0.1)]"
                style={{
                  width: `${PREVIEW_DOCUMENT_FRAME_WIDTH - 2}px`,
                  minHeight: `${A4_DOCUMENT_HEIGHT}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                }}
              >
                <div ref={contentMeasureRef}>{children}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
