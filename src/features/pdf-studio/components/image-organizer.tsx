"use client";

import { useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { ImageThumbnail } from "@/features/pdf-studio/components/image-thumbnail";
import type { ImageItem, ImageRotation } from "@/features/pdf-studio/types";
import {
  PDF_STUDIO_MAX_IMAGES,
  PDF_STUDIO_SUPPORTED_FORMATS,
} from "@/features/pdf-studio/constants";
import { loadImageFromFile } from "@/features/pdf-studio/utils/image-processor";
import { cn } from "@/lib/utils";

type ImageOrganizerProps = {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  error?: string;
};

function UploadIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function generateId() {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ImageOrganizer({ images, onChange, error }: ImageOrganizerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);
      onChange(arrayMove(images, oldIndex, newIndex));
    },
    [images, onChange],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = PDF_STUDIO_MAX_IMAGES - images.length;

      if (remaining <= 0) {
        return;
      }

      const valid = fileArray
        .filter((f) => PDF_STUDIO_SUPPORTED_FORMATS.includes(f.type))
        .slice(0, remaining);

      const newItems: ImageItem[] = await Promise.all(
        valid.map(async (file) => {
          const previewUrl = await loadImageFromFile(file);
          return {
            id: generateId(),
            file,
            previewUrl,
            rotation: 0 as ImageRotation,
            name: file.name,
            sizeBytes: file.size,
          };
        }),
      );

      onChange([...images, ...newItems]);
    },
    [images, onChange],
  );

  const handleFileInput = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;
      await handleFiles(files);
      event.target.value = "";
    },
    [handleFiles],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = event.dataTransfer.files;
      if (!files) return;
      await handleFiles(files);
    },
    [handleFiles],
  );

  const handleRotateLeft = useCallback(
    (id: string) => {
      onChange(
        images.map((img) =>
          img.id === id
            ? { ...img, rotation: (((img.rotation - 90) % 360 + 360) % 360) as ImageRotation }
            : img,
        ),
      );
    },
    [images, onChange],
  );

  const handleRotateRight = useCallback(
    (id: string) => {
      onChange(
        images.map((img) =>
          img.id === id
            ? { ...img, rotation: ((img.rotation + 90) % 360) as ImageRotation }
            : img,
        ),
      );
    },
    [images, onChange],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const item = images.find((img) => img.id === id);
      if (item?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
      onChange(images.filter((img) => img.id !== id));
    },
    [images, onChange],
  );

  const handleClearAll = useCallback(() => {
    images.forEach((img) => {
      if (img.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    onChange([]);
  }, [images, onChange]);

  const isFull = images.length >= PDF_STUDIO_MAX_IMAGES;

  return (
    <div className="space-y-4">
      {!isFull ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.6rem] border-2 border-dashed px-6 py-10 text-center transition-colors",
            error
              ? "border-[var(--danger)] bg-[rgba(220,38,38,0.04)]"
              : "border-[var(--border-strong)] bg-[rgba(248,241,235,0.6)] hover:border-[var(--accent)] hover:bg-[rgba(232,64,30,0.04)]",
          )}
        >
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-[var(--border-soft)] bg-white text-[var(--accent)] shadow-[0_12px_28px_rgba(34,34,34,0.06)]">
            <UploadIcon />
          </span>
          <div>
            <p className="text-[0.95rem] font-medium text-[var(--foreground)]">
              Drop images here or click to browse
            </p>
            <p className="mt-1 text-[0.82rem] text-[var(--muted-foreground)]">
              JPG, PNG, WEBP · up to {PDF_STUDIO_MAX_IMAGES} images
            </p>
          </div>
          {images.length > 0 ? (
            <p className="text-[0.78rem] text-[var(--foreground-soft)]">
              {images.length} of {PDF_STUDIO_MAX_IMAGES} added · {PDF_STUDIO_MAX_IMAGES - images.length} remaining
            </p>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-[1.4rem] border border-[var(--border-soft)] bg-white px-4 py-3.5">
          <p className="text-[0.88rem] text-[var(--foreground-soft)]">
            Maximum of {PDF_STUDIO_MAX_IMAGES} images reached.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-[0.82rem] font-medium text-[var(--accent)] underline decoration-[var(--accent-soft)] underline-offset-4"
          >
            Replace
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      )}

      {error ? (
        <p className="px-1 text-[0.82rem] text-[var(--danger)]">{error}</p>
      ) : null}

      {images.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              {images.length} {images.length === 1 ? "image" : "images"}
            </p>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[0.78rem] font-medium text-[var(--foreground-soft)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--danger)]"
            >
              Clear all
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map((img) => img.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((item, index) => (
                  <ImageThumbnail
                    key={item.id}
                    item={item}
                    index={index}
                    onRotateLeft={handleRotateLeft}
                    onRotateRight={handleRotateRight}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : null}
    </div>
  );
}
