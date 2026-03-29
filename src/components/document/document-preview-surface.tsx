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
  const documentFrameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(PREVIEW_DOCUMENT_FRAME_HEIGHT);

  useEffect(() => {
    const viewport = viewportRef.current;
    const documentFrame = documentFrameRef.current;

    if (!viewport || !documentFrame) {
      return;
    }

    const updateScale = () => {
      const availableWidth = Math.max(
        0,
        viewport.clientWidth - PREVIEW_VIEWPORT_HORIZONTAL_GUTTER,
      );
      const nextScale = Math.min(1, availableWidth / PREVIEW_DOCUMENT_FRAME_WIDTH);
      setScale(nextScale);
    };

    const updateContentHeight = () => {
      setContentHeight(
        Math.max(PREVIEW_DOCUMENT_FRAME_HEIGHT, documentFrame.scrollHeight + 2),
      );
    };

    updateScale();
    updateContentHeight();

    const viewportObserver = new ResizeObserver(() => {
      updateScale();
    });
    const documentObserver = new ResizeObserver(() => {
      updateContentHeight();
    });

    viewportObserver.observe(viewport);
    documentObserver.observe(documentFrame);

    return () => {
      viewportObserver.disconnect();
      documentObserver.disconnect();
    };
  }, []);

  const scaledHeight = useMemo(
    () => Math.max(420, Math.ceil(contentHeight * scale)),
    [contentHeight, scale],
  );
  const scaledWidth = useMemo(
    () => Math.ceil(PREVIEW_DOCUMENT_FRAME_WIDTH * scale),
    [scale],
  );

  return (
    <div className="relative overflow-hidden rounded-[1.85rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(236,244,255,0.96),rgba(229,239,252,0.92))] p-3 shadow-[var(--shadow-card)] sm:p-4">
      <div className="absolute inset-x-10 top-0 h-20 rounded-full bg-[radial-gradient(circle,rgba(45,107,255,0.16),transparent_72%)] blur-3xl" />
      <div className="relative space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--border-soft)] bg-white/82 px-4 py-3">
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

        <div
          ref={viewportRef}
          data-testid="document-preview-viewport"
          className="overflow-hidden rounded-[1.5rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,#fffdf8,#faf5ec)] p-1.5 sm:p-2.5"
        >
          <div
            className="mx-auto flex max-w-full justify-center"
            style={{
              width: `${scaledWidth}px`,
              minHeight: `${scaledHeight}px`,
            }}
          >
            <div
              ref={documentFrameRef}
              className="overflow-hidden rounded-[1.25rem] border border-[rgba(29,23,16,0.08)] shadow-[0_24px_48px_rgba(38,30,20,0.08)]"
              style={{
                width: `${PREVIEW_DOCUMENT_FRAME_WIDTH - 2}px`,
                minHeight: `${A4_DOCUMENT_HEIGHT}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top center",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
