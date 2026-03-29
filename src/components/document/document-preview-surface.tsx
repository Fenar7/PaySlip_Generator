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
    <div className="relative overflow-hidden rounded-[1.9rem] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(244,248,255,0.82),rgba(255,255,255,0.98))] p-3 shadow-[var(--shadow-card)] sm:p-4">
      <div className="relative space-y-4">
        <div className="rounded-[1.25rem] border border-[rgba(15,23,42,0.08)] bg-white/92 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
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

        <div
          ref={viewportRef}
          data-testid="document-preview-viewport"
          className="overflow-hidden rounded-[1.7rem] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#f8fbff,#eef4ff)] p-2.5 sm:p-3.5"
        >
          <div className="mb-3 flex items-center justify-between rounded-[1rem] border border-[rgba(15,23,42,0.08)] bg-white/88 px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            <span>Document canvas</span>
            <span>Synced</span>
          </div>

          <div
            className="mx-auto flex max-w-full justify-center"
            style={{
              width: `${scaledWidth}px`,
              minHeight: `${scaledHeight}px`,
            }}
          >
            <div
              ref={documentFrameRef}
              className="overflow-hidden rounded-[1.25rem] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_28px_52px_rgba(15,23,42,0.12)]"
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
