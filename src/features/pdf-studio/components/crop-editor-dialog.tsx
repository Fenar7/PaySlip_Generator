"use client";

import { useMemo, useState } from "react";
import type { ImageCrop, ImageItem } from "@/features/pdf-studio/types";
import { normalizeImageCrop } from "@/features/pdf-studio/utils/image-processor";
import { cn } from "@/lib/utils";

type CropEditorDialogProps = {
  item: ImageItem;
  onApply: (crop: ImageCrop | undefined) => void;
  onClose: () => void;
};

type CropDraft = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_CROP: CropDraft = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

function clampCrop(draft: CropDraft): CropDraft {
  const x = Math.min(0.95, Math.max(0, draft.x));
  const y = Math.min(0.95, Math.max(0, draft.y));
  const width = Math.min(1, Math.max(0.05, draft.width));
  const height = Math.min(1, Math.max(0.05, draft.height));

  return {
    x,
    y,
    width: Math.min(width, 1 - x),
    height: Math.min(height, 1 - y),
  };
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-[0.78rem] font-medium text-[var(--foreground-soft)]">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}

export function CropEditorDialog({ item, onApply, onClose }: CropEditorDialogProps) {
  const [draft, setDraft] = useState<CropDraft>(() => item.crop ?? DEFAULT_CROP);

  const normalizedDraft = useMemo(() => clampCrop(draft), [draft]);
  const appliedCrop = useMemo(() => normalizeImageCrop(normalizedDraft), [normalizedDraft]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-[rgba(34,34,34,0.32)]" aria-label="Close crop dialog" />
      <div className="relative z-10 w-full max-w-[56rem] overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.72)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,241,235,0.98))] p-4 shadow-[0_28px_72px_rgba(34,34,34,0.14)] sm:p-6">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.35fr)_20rem] lg:items-start">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
                  Crop editor
                </p>
                <h3 className="mt-2 text-[1.5rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                  Adjust visible area
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--foreground-soft)]">
                  Crop is applied before rotation and export so the preview and final PDF stay aligned.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-white text-[var(--foreground-soft)] shadow-[0_10px_24px_rgba(34,34,34,0.05)] transition-colors hover:bg-[rgba(248,241,235,0.82)]"
                aria-label="Close crop dialog"
              >
                ×
              </button>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[rgba(245,239,233,0.72)] p-4 shadow-[0_10px_24px_rgba(34,34,34,0.04)]">
              <div className="relative mx-auto aspect-[4/3] max-h-[34rem] overflow-hidden rounded-[1.25rem] border border-[var(--border-soft)] bg-white">
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
                <div className="pointer-events-none absolute inset-0 bg-[rgba(34,34,34,0.28)]" />
                <div
                  className={cn(
                    "pointer-events-none absolute border-2 border-[var(--accent)] bg-[rgba(255,255,255,0.08)] shadow-[0_0_0_9999px_rgba(34,34,34,0.32)]",
                    item.rotation === 90 || item.rotation === 270 ? "rounded-[1rem]" : "rounded-[1.2rem]",
                  )}
                  style={{
                    left: `${normalizedDraft.x * 100}%`,
                    top: `${normalizedDraft.y * 100}%`,
                    width: `${normalizedDraft.width * 100}%`,
                    height: `${normalizedDraft.height * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[1.5rem] border border-[var(--border-soft)] bg-white/92 p-4 shadow-[0_12px_28px_rgba(34,34,34,0.05)]">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Image
              </p>
              <p className="mt-2 truncate text-sm font-medium text-[var(--foreground)]">{item.name}</p>
            </div>

            <div className="space-y-3">
              <SliderField
                label="Left offset"
                value={normalizedDraft.x}
                min={0}
                max={0.95}
                step={0.01}
                onChange={(x) => setDraft((current) => clampCrop({ ...current, x }))}
              />
              <SliderField
                label="Top offset"
                value={normalizedDraft.y}
                min={0}
                max={0.95}
                step={0.01}
                onChange={(y) => setDraft((current) => clampCrop({ ...current, y }))}
              />
              <SliderField
                label="Width"
                value={normalizedDraft.width}
                min={0.05}
                max={1}
                step={0.01}
                onChange={(width) => setDraft((current) => clampCrop({ ...current, width }))}
              />
              <SliderField
                label="Height"
                value={normalizedDraft.height}
                min={0.05}
                max={1}
                step={0.01}
                onChange={(height) => setDraft((current) => clampCrop({ ...current, height }))}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <button
                type="button"
                onClick={() => setDraft(DEFAULT_CROP)}
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground)] shadow-[0_10px_24px_rgba(34,34,34,0.04)] transition-colors hover:bg-[rgba(248,241,235,0.72)]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => onApply(appliedCrop)}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-2.5 text-sm font-medium text-white shadow-[0_16px_30px_rgba(232,64,30,0.18)] transition-all hover:brightness-105"
              >
                Apply crop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
