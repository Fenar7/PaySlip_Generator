"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const MIN_CROP_SIZE = 0.05;

type HandleDirection =
  | "move"
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-right"
  | "bottom-left";

type ImageRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type AspectRatioPreset = "free" | "original" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16";

function clampCrop(draft: CropDraft): CropDraft {
  const x = Math.min(0.95, Math.max(0, draft.x));
  const y = Math.min(0.95, Math.max(0, draft.y));
  const width = Math.min(1, Math.max(MIN_CROP_SIZE, draft.width));
  const height = Math.min(1, Math.max(MIN_CROP_SIZE, draft.height));

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

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getContainedImageRect(container: DOMRect, naturalWidth: number, naturalHeight: number): ImageRect {
  const containerAspect = container.width / container.height;
  const imageAspect = naturalWidth / naturalHeight;

  if (imageAspect > containerAspect) {
    const width = container.width;
    const height = width / imageAspect;
    return {
      left: 0,
      top: (container.height - height) / 2,
      width,
      height,
    };
  }

  const height = container.height;
  const width = height * imageAspect;
  return {
    left: (container.width - width) / 2,
    top: 0,
    width,
    height,
  };
}

function applyDragDelta(start: CropDraft, deltaX: number, deltaY: number): CropDraft {
  const nextX = clampValue(start.x + deltaX, 0, 1 - start.width);
  const nextY = clampValue(start.y + deltaY, 0, 1 - start.height);

  return {
    ...start,
    x: nextX,
    y: nextY,
  };
}

function applyResizeDelta(
  start: CropDraft,
  direction: Exclude<HandleDirection, "move">,
  deltaX: number,
  deltaY: number,
): CropDraft {
  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;

  if (direction.includes("left")) {
    left = clampValue(start.x + deltaX, 0, right - MIN_CROP_SIZE);
  }
  if (direction.includes("right")) {
    right = clampValue(start.x + start.width + deltaX, left + MIN_CROP_SIZE, 1);
  }
  if (direction.includes("top")) {
    top = clampValue(start.y + deltaY, 0, bottom - MIN_CROP_SIZE);
  }
  if (direction.includes("bottom")) {
    bottom = clampValue(start.y + start.height + deltaY, top + MIN_CROP_SIZE, 1);
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function getCursor(direction: HandleDirection): string {
  switch (direction) {
    case "move":
      return "move";
    case "top":
    case "bottom":
      return "ns-resize";
    case "left":
    case "right":
      return "ew-resize";
    case "top-left":
    case "bottom-right":
      return "nwse-resize";
    case "top-right":
    case "bottom-left":
      return "nesw-resize";
    default:
      return "default";
  }
}

function getPresetRatio(preset: Exclude<AspectRatioPreset, "free" | "original">): number {
  switch (preset) {
    case "1:1":
      return 1;
    case "4:3":
      return 4 / 3;
    case "3:4":
      return 3 / 4;
    case "16:9":
      return 16 / 9;
    case "9:16":
      return 9 / 16;
  }
}

function getLockedAspectRatio(
  preset: AspectRatioPreset,
  naturalSize: { width: number; height: number } | null,
): number | null {
  if (preset === "free") {
    return null;
  }

  if (preset === "original") {
    if (!naturalSize) {
      return null;
    }

    return naturalSize.width / naturalSize.height;
  }

  return getPresetRatio(preset);
}

function fitCropToAspectRatio(crop: CropDraft, ratio: number): CropDraft {
  const centerX = crop.x + crop.width / 2;
  const centerY = crop.y + crop.height / 2;
  const maxWidth = 2 * Math.min(centerX, 1 - centerX);
  const maxHeight = 2 * Math.min(centerY, 1 - centerY);
  const targetArea = crop.width * crop.height;

  let width = Math.sqrt(targetArea * ratio);
  let height = width / ratio;

  const minWidth = Math.max(MIN_CROP_SIZE, MIN_CROP_SIZE * ratio);
  if (width < minWidth) {
    width = minWidth;
    height = width / ratio;
  }

  if (width > maxWidth || height > maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height);
    width *= scale;
    height *= scale;
  }

  width = clampValue(width, minWidth, Math.min(maxWidth, maxHeight * ratio));
  height = width / ratio;

  return clampCrop({
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  });
}

function applyResizeDeltaWithRatio(
  start: CropDraft,
  direction: "top-left" | "top-right" | "bottom-right" | "bottom-left",
  deltaX: number,
  deltaY: number,
  ratio: number,
): CropDraft {
  const minWidth = Math.max(MIN_CROP_SIZE, MIN_CROP_SIZE * ratio);

  let anchorX = start.x;
  let anchorY = start.y;
  let proposedWidthFromX = start.width;
  let proposedWidthFromY = start.width;
  let availableWidth = 1;
  let availableHeight = 1;
  let nextX = start.x;
  let nextY = start.y;

  switch (direction) {
    case "bottom-right":
      anchorX = start.x;
      anchorY = start.y;
      proposedWidthFromX = start.width + deltaX;
      proposedWidthFromY = (start.height + deltaY) * ratio;
      availableWidth = 1 - anchorX;
      availableHeight = 1 - anchorY;
      nextX = anchorX;
      nextY = anchorY;
      break;
    case "bottom-left":
      anchorX = start.x + start.width;
      anchorY = start.y;
      proposedWidthFromX = start.width - deltaX;
      proposedWidthFromY = (start.height + deltaY) * ratio;
      availableWidth = anchorX;
      availableHeight = 1 - anchorY;
      break;
    case "top-right":
      anchorX = start.x;
      anchorY = start.y + start.height;
      proposedWidthFromX = start.width + deltaX;
      proposedWidthFromY = (start.height - deltaY) * ratio;
      availableWidth = 1 - anchorX;
      availableHeight = anchorY;
      nextX = anchorX;
      break;
    case "top-left":
      anchorX = start.x + start.width;
      anchorY = start.y + start.height;
      proposedWidthFromX = start.width - deltaX;
      proposedWidthFromY = (start.height - deltaY) * ratio;
      availableWidth = anchorX;
      availableHeight = anchorY;
      break;
  }

  let width =
    Math.abs(proposedWidthFromX - start.width) >= Math.abs(proposedWidthFromY - start.width)
      ? proposedWidthFromX
      : proposedWidthFromY;

  width = clampValue(width, minWidth, Math.min(availableWidth, availableHeight * ratio));
  const height = width / ratio;

  if (direction.includes("left")) {
    nextX = anchorX - width;
  }
  if (direction.includes("top")) {
    nextY = anchorY - height;
  }
  if (direction === "bottom-left") {
    nextY = anchorY;
  }
  if (direction === "bottom-right") {
    nextY = anchorY;
  }

  return clampCrop({
    x: nextX,
    y: nextY,
    width,
    height,
  });
}

function applyWidthWithRatio(start: CropDraft, width: number, ratio: number): CropDraft {
  const maxWidthByBounds = Math.min(1 - start.x, (1 - start.y) * ratio);
  const minWidth = Math.max(MIN_CROP_SIZE, MIN_CROP_SIZE * ratio);
  const nextWidth = clampValue(width, minWidth, maxWidthByBounds);

  return clampCrop({
    ...start,
    width: nextWidth,
    height: nextWidth / ratio,
  });
}

function applyHeightWithRatio(start: CropDraft, height: number, ratio: number): CropDraft {
  const maxHeightByBounds = Math.min(1 - start.y, (1 - start.x) / ratio);
  const minHeight = Math.max(MIN_CROP_SIZE, MIN_CROP_SIZE / ratio);
  const nextHeight = clampValue(height, minHeight, maxHeightByBounds);

  return clampCrop({
    ...start,
    height: nextHeight,
    width: nextHeight * ratio,
  });
}

export function CropEditorDialog({ item, onApply, onClose }: CropEditorDialogProps) {
  const [draft, setDraft] = useState<CropDraft>(() => item.crop ?? DEFAULT_CROP);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [activeDirection, setActiveDirection] = useState<HandleDirection | null>(null);
  const [aspectRatioPreset, setAspectRatioPreset] = useState<AspectRatioPreset>("free");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<{
    pointerId: number;
    direction: HandleDirection;
    startX: number;
    startY: number;
    startDraft: CropDraft;
  } | null>(null);

  const normalizedDraft = useMemo(() => clampCrop(draft), [draft]);
  const appliedCrop = useMemo(() => normalizeImageCrop(normalizedDraft), [normalizedDraft]);
  const lockedAspectRatio = useMemo(
    () => getLockedAspectRatio(aspectRatioPreset, naturalSize),
    [aspectRatioPreset, naturalSize],
  );
  const imageRect = useMemo(() => {
    if (!containerRect || !naturalSize) {
      return null;
    }

    return getContainedImageRect(containerRect, naturalSize.width, naturalSize.height);
  }, [containerRect, naturalSize]);

  const updateContainerRect = () => {
    if (!containerRef.current) {
      return;
    }

    setContainerRect(containerRef.current.getBoundingClientRect());
  };

  useEffect(() => {
    updateContainerRect();

    const handleResize = () => updateContainerRect();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const beginInteraction = (direction: HandleDirection, pointerId: number, clientX: number, clientY: number) => {
    interactionRef.current = {
      pointerId,
      direction,
      startX: clientX,
      startY: clientY,
      startDraft: normalizedDraft,
    };
    setActiveDirection(direction);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId || !imageRect) {
      return;
    }

    const deltaX = (event.clientX - interaction.startX) / imageRect.width;
    const deltaY = (event.clientY - interaction.startY) / imageRect.height;

    const nextDraft =
      interaction.direction === "move"
        ? applyDragDelta(interaction.startDraft, deltaX, deltaY)
        : lockedAspectRatio && (
              interaction.direction === "top-left" ||
              interaction.direction === "top-right" ||
              interaction.direction === "bottom-right" ||
              interaction.direction === "bottom-left"
            )
          ? applyResizeDeltaWithRatio(interaction.startDraft, interaction.direction, deltaX, deltaY, lockedAspectRatio)
          : applyResizeDelta(interaction.startDraft, interaction.direction, deltaX, deltaY);

    setDraft(clampCrop(nextDraft));
  };

  const endInteraction = (pointerId: number) => {
    if (interactionRef.current?.pointerId === pointerId) {
      interactionRef.current = null;
      setActiveDirection(null);
    }
  };

  const handles: { direction: Exclude<HandleDirection, "move">; className: string }[] = [
    { direction: "top-left", className: "-left-2 -top-2" },
    { direction: "top", className: "left-1/2 -top-2 -translate-x-1/2" },
    { direction: "top-right", className: "-right-2 -top-2" },
    { direction: "right", className: "right-[-0.5rem] top-1/2 -translate-y-1/2" },
    { direction: "bottom-right", className: "-right-2 -bottom-2" },
    { direction: "bottom", className: "left-1/2 -bottom-2 -translate-x-1/2" },
    { direction: "bottom-left", className: "-left-2 -bottom-2" },
    { direction: "left", className: "left-[-0.5rem] top-1/2 -translate-y-1/2" },
  ];
  const isRatioLocked = lockedAspectRatio !== null;
  const ratioOptions: AspectRatioPreset[] = ["free", "original", "1:1", "4:3", "3:4", "16:9", "9:16"];

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
                <p className="mt-1 text-sm leading-7 text-[var(--muted-foreground)]">
                  Drag inside the box to move it, or drag the handles to resize.
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
              <div
                ref={containerRef}
                className="relative mx-auto aspect-[4/3] max-h-[34rem] overflow-hidden rounded-[1.25rem] border border-[var(--border-soft)] bg-white touch-none"
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => endInteraction(event.pointerId)}
                onPointerCancel={(event) => endInteraction(event.pointerId)}
                onPointerLeave={(event) => endInteraction(event.pointerId)}
              >
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="h-full w-full object-contain"
                  draggable={false}
                  onLoad={(event) => {
                    setNaturalSize({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    });
                    updateContainerRect();
                  }}
                />
                {imageRect ? (
                  <div
                    className="absolute"
                    style={{
                      left: imageRect.left,
                      top: imageRect.top,
                      width: imageRect.width,
                      height: imageRect.height,
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[rgba(34,34,34,0.28)]" />
                    <div
                      className={cn(
                        "absolute border-2 border-[var(--accent)] bg-[rgba(255,255,255,0.08)] shadow-[0_0_0_9999px_rgba(34,34,34,0.32)]",
                        item.rotation === 90 || item.rotation === 270 ? "rounded-[1rem]" : "rounded-[1.2rem]",
                      )}
                      style={{
                        left: `${normalizedDraft.x * 100}%`,
                        top: `${normalizedDraft.y * 100}%`,
                        width: `${normalizedDraft.width * 100}%`,
                        height: `${normalizedDraft.height * 100}%`,
                        cursor: activeDirection === "move" ? "grabbing" : "move",
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        containerRef.current?.setPointerCapture(event.pointerId);
                        beginInteraction("move", event.pointerId, event.clientX, event.clientY);
                      }}
                    >
                      <div className="absolute inset-0 bg-transparent" />
                      {handles.map((handle) => (
                        (() => {
                          const isEdgeHandle =
                            handle.direction === "top" ||
                            handle.direction === "right" ||
                            handle.direction === "bottom" ||
                            handle.direction === "left";
                          const isDisabled = isRatioLocked && isEdgeHandle;

                          return (
                        <button
                          key={handle.direction}
                          type="button"
                          aria-label={`Resize crop ${handle.direction}`}
                          disabled={isDisabled}
                          className={cn(
                            "absolute h-4 w-4 rounded-full border-2 border-white bg-[var(--accent)] shadow-[0_4px_12px_rgba(34,34,34,0.18)]",
                            handle.className,
                            isDisabled && "cursor-not-allowed opacity-35",
                          )}
                          style={{ cursor: isDisabled ? "not-allowed" : getCursor(handle.direction) }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            containerRef.current?.setPointerCapture(event.pointerId);
                            beginInteraction(handle.direction, event.pointerId, event.clientX, event.clientY);
                          }}
                        />
                          );
                        })()
                      ))}
                    </div>
                  </div>
                ) : null}
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

            <div className="space-y-3 rounded-[1rem] border border-[var(--border-soft)] bg-[rgba(248,241,235,0.55)] p-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-[0.82rem] font-medium text-[var(--foreground)]">Preserve ratio</span>
                <button
                  type="button"
                  onClick={() => {
                    if (isRatioLocked) {
                      setAspectRatioPreset("free");
                      return;
                    }

                    setAspectRatioPreset("original");
                    if (naturalSize) {
                      setDraft((current) => fitCropToAspectRatio(current, naturalSize.width / naturalSize.height));
                    }
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    isRatioLocked ? "bg-[var(--accent)]" : "bg-[var(--border-soft)]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform",
                      isRatioLocked ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {ratioOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      if (option === "free") {
                        setAspectRatioPreset("free");
                        return;
                      }

                      const nextRatio =
                        option === "original"
                          ? naturalSize
                            ? naturalSize.width / naturalSize.height
                            : null
                          : getPresetRatio(option);

                      if (!nextRatio) {
                        return;
                      }

                      setAspectRatioPreset(option);
                      setDraft((current) => fitCropToAspectRatio(current, nextRatio));
                    }}
                    disabled={option === "original" && !naturalSize}
                    className={cn(
                      "rounded-[0.85rem] border px-2 py-2 text-[0.76rem] font-medium transition-colors",
                      aspectRatioPreset === option
                        ? "border-[var(--accent)] bg-white text-[var(--foreground)] shadow-[0_8px_20px_rgba(232,64,30,0.10)]"
                        : "border-[var(--border-soft)] bg-white/80 text-[var(--foreground-soft)] hover:border-[var(--border-strong)]",
                      option === "original" && !naturalSize && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {option === "free" ? "Free" : option === "original" ? "Original" : option}
                  </button>
                ))}
              </div>
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
                onChange={(width) =>
                  setDraft((current) =>
                    lockedAspectRatio ? applyWidthWithRatio(current, width, lockedAspectRatio) : clampCrop({ ...current, width }),
                  )
                }
              />
              <SliderField
                label="Height"
                value={normalizedDraft.height}
                min={0.05}
                max={1}
                step={0.01}
                onChange={(height) =>
                  setDraft((current) =>
                    lockedAspectRatio ? applyHeightWithRatio(current, height, lockedAspectRatio) : clampCrop({ ...current, height }),
                  )
                }
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(DEFAULT_CROP);
                  setAspectRatioPreset("free");
                }}
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
