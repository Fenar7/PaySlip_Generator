"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ImageItem } from "@/features/pdf-studio/types";
import { cn } from "@/lib/utils";

type ImageThumbnailProps = {
  item: ImageItem;
  index: number;
  onRotateLeft: (id: string) => void;
  onRotateRight: (id: string) => void;
  onDelete: (id: string) => void;
};

function RotateLeftIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function RotateRightIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="6" r="1" fill="currentColor" />
      <circle cx="15" cy="6" r="1" fill="currentColor" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="18" r="1" fill="currentColor" />
      <circle cx="15" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

export function ImageThumbnail({
  item,
  index,
  onRotateLeft,
  onRotateRight,
  onDelete,
}: ImageThumbnailProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col rounded-[1.4rem] border border-[var(--border-soft)] bg-white shadow-[0_10px_24px_rgba(34,34,34,0.05)] transition-shadow",
        isDragging
          ? "z-50 shadow-[0_28px_60px_rgba(34,34,34,0.14)] ring-2 ring-[var(--accent)] ring-offset-2"
          : "hover:shadow-[0_14px_32px_rgba(34,34,34,0.08)]",
      )}
    >
      <div className="relative overflow-hidden rounded-t-[1.3rem] bg-[var(--surface-soft)]">
        <div className="aspect-[3/4] w-full overflow-hidden">
          <img
            src={item.previewUrl}
            alt={item.name}
            className="h-full w-full object-contain"
            style={{
              transform: item.rotation !== 0 ? `rotate(${item.rotation}deg)` : undefined,
              transition: "transform 200ms ease",
            }}
            draggable={false}
          />
        </div>

        <div className="absolute left-2 top-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(34,34,34,0.68)] text-[0.62rem] font-semibold text-white backdrop-blur-sm">
            {index + 1}
          </span>
        </div>

        <div
          {...attributes}
          {...listeners}
          className="absolute right-2 top-2 inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-full bg-white/90 text-[var(--foreground-soft)] shadow-[0_4px_12px_rgba(34,34,34,0.10)] backdrop-blur-sm transition-opacity active:cursor-grabbing"
          aria-label="Drag to reorder"
          title="Drag to reorder"
        >
          <DragHandleIcon />
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 p-2">
        <button
          type="button"
          onClick={() => onRotateLeft(item.id)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-white text-[var(--foreground-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
          aria-label="Rotate left"
          title="Rotate left"
        >
          <RotateLeftIcon />
        </button>

        <button
          type="button"
          onClick={() => onRotateRight(item.id)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-white text-[var(--foreground-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
          aria-label="Rotate right"
          title="Rotate right"
        >
          <RotateRightIcon />
        </button>

        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-white text-[var(--foreground-soft)] transition-colors hover:border-[rgba(220,38,38,0.2)] hover:text-[var(--danger)]"
          aria-label={`Remove ${item.name}`}
          title="Remove image"
        >
          <DeleteIcon />
        </button>
      </div>

      <div className="truncate px-3 pb-3 text-[0.7rem] text-[var(--muted-foreground)]">
        {item.name}
      </div>
    </div>
  );
}
