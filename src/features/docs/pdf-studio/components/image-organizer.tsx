"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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
import { CropEditorDialog } from "@/features/docs/pdf-studio/components/crop-editor-dialog";
import { ImageThumbnail } from "@/features/docs/pdf-studio/components/image-thumbnail";
import type { ImageItem, ImageRotation } from "@/features/docs/pdf-studio/types";
import {
  PDF_STUDIO_MAX_IMAGES,
  PDF_STUDIO_SUPPORTED_EXTENSIONS,
} from "@/features/docs/pdf-studio/constants";
import { trackPdfStudioLifecycleEvent } from "@/features/docs/pdf-studio/lib/analytics";
import { validatePdfStudioFiles } from "@/features/docs/pdf-studio/lib/ingestion";
import { loadImageFromFile } from "@/features/docs/pdf-studio/utils/image-processor";
import { convertHeicToJpeg } from "@/features/docs/pdf-studio/utils/heic-converter";
import { processImageForOcr, getOcrServiceStatus } from "@/features/docs/pdf-studio/utils/ocr-processor";
import { cn } from "@/lib/utils";
import type { MouseEvent } from "react";

/**
 * Run OCR for a single image and update state accordingly.
 * Extracted as a module-level helper so it can be shared between
 * initial upload flow, the per-image retry handler, and the workspace.
 */
export async function runOcrForImage(
  imageId: string,
  file: File | Blob,
  onChange: (fn: (imgs: ImageItem[]) => ImageItem[]) => void,
  onOcrUnavailable?: () => void,
): Promise<void> {
  // Mark as processing
  onChange((currentImages) =>
    currentImages.map((img) =>
      img.id === imageId ? { ...img, ocrStatus: "processing" as const } : img,
    ),
  );

  try {
    const ocrText = await processImageForOcr(file, imageId);
    onChange((currentImages) =>
      currentImages.map((img) =>
        img.id === imageId
          ? { ...img, ocrText, ocrStatus: "complete" as const, ocrErrorMessage: undefined }
          : img,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR failed";
    onChange((currentImages) =>
      currentImages.map((img) =>
        img.id === imageId
          ? { ...img, ocrStatus: "error" as const, ocrErrorMessage: message, ocrText: undefined }
          : img,
      ),
    );
    // Notify caller if OCR service itself is unavailable
    if (getOcrServiceStatus() === "unavailable") {
      onOcrUnavailable?.();
    }
  }
}

type ImageOrganizerProps = {
  images: ImageItem[];
  onChange: (images: ImageItem[] | ((prevImages: ImageItem[]) => ImageItem[])) => void;
  error?: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBatchDelete: () => void;
  onBatchRotateLeft: () => void;
  onBatchRotateRight: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onUploadError?: (message?: string) => void;
  onOcrUnavailable?: () => void;
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

export function ImageOrganizer({
  images,
  onChange,
  error,
  selectedIds,
  onSelectionChange,
  onBatchDelete,
  onBatchRotateLeft,
  onBatchRotateRight,
  onSelectAll,
  onClearSelection,
  onUploadError,
  onOcrUnavailable,
}: ImageOrganizerProps) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropTargetId, setCropTargetId] = useState<string | null>(null);

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
      const validation = validatePdfStudioFiles("create", files, {
        currentFileCount: images.length,
      });
      if (!validation.ok) {
        onUploadError?.(validation.error);
        return;
      }

      onUploadError?.(undefined);
      trackPdfStudioLifecycleEvent("pdf_studio_upload", {
        subject: "create",
        surface: pathname.startsWith("/app/docs/pdf-studio")
          ? "workspace"
          : "public",
        route: pathname,
        executionMode: "browser",
        fileCount: validation.files.length,
        totalBytes: validation.totalBytes,
        fileClasses: validation.fileClasses,
      });

      validation.files.forEach(async (file) => {
        const isHeic = file.type === "image/heic" || file.type === "image/heif" || file.name.endsWith(".heic") || file.name.endsWith(".heif");
        const id = generateId();

        let finalImageFile = file;
        let finalPreviewUrl = "";
        let finalName = file.name;
        let finalSizeBytes = file.size;
        let initialIsConverting = false;

        if (isHeic) {
          initialIsConverting = true;
          const placeholder: ImageItem = {
            id,
            previewUrl: "",
            rotation: 0 as ImageRotation,
            name: file.name,
            sizeBytes: file.size,
            isConverting: true,
          };

          onChange((currentImages: ImageItem[]) => [...currentImages, placeholder]);

          try {
            const convertedFile = await convertHeicToJpeg(file);
            finalImageFile = convertedFile;
            finalPreviewUrl = await loadImageFromFile(convertedFile);
            finalName = convertedFile.name;
            finalSizeBytes = convertedFile.size;
            initialIsConverting = false;
          } catch (error) {
            console.error("HEIC conversion failed:", error);
            onUploadError?.(
              "Could not process this file. Please try a JPG, PNG, or WebP version.",
            );
            onChange((currentImages: ImageItem[]) => currentImages.filter((img) => img.id !== id));
            return;
          }
        } else {
          finalPreviewUrl = await loadImageFromFile(file);
        }

        const newItem: ImageItem = {
          id,
          file: finalImageFile,
          previewUrl: finalPreviewUrl,
          rotation: 0 as ImageRotation,
          name: finalName,
          sizeBytes: finalSizeBytes,
          isConverting: initialIsConverting,
        };

        // Add the image to the list with pending OCR status
        onChange((currentImages: ImageItem[]) => [
          ...currentImages,
          { ...newItem, ocrStatus: "pending" as const },
        ]);

        // Start OCR in background — only if file is available
        if (newItem.file) {
          runOcrForImage(id, newItem.file, onChange, onOcrUnavailable);
        }
      });
    },
    [images.length, onChange, onOcrUnavailable, onUploadError, pathname],
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
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
      onChange(images.filter((img) => img.id !== id));
    },
    [images, onChange, onSelectionChange, selectedIds],
  );

  const handleCropOpen = useCallback((id: string) => {
    setCropTargetId(id);
  }, []);

  const handleCropClose = useCallback(() => {
    setCropTargetId(null);
  }, []);

  const handleCropApply = useCallback(
    (crop: ImageItem["crop"]) => {
      if (!cropTargetId) {
        return;
      }

      onChange(
        images.map((img) => (img.id === cropTargetId ? { ...img, crop } : img)),
      );
      setCropTargetId(null);
    },
    [cropTargetId, images, onChange],
  );

  const handleClearAll = useCallback(() => {
    images.forEach((img) => {
      if (img.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    onClearSelection();
    onChange([]);
  }, [images, onChange, onClearSelection]);

  const handleSelect = useCallback(
    (id: string, event: MouseEvent<HTMLButtonElement>) => {
      const index = images.findIndex((img) => img.id === id);
      if (index === -1) {
        return;
      }

      if (event.shiftKey && selectedIds.length > 0) {
        const selectedIndexes = selectedIds
          .map((selectedId) => images.findIndex((img) => img.id === selectedId))
          .filter((selectedIndex) => selectedIndex >= 0);
        const anchor = selectedIndexes.length > 0 ? selectedIndexes[selectedIndexes.length - 1] : index;
        const start = Math.min(anchor, index);
        const end = Math.max(anchor, index);
        const rangeIds = images.slice(start, end + 1).map((img) => img.id);
        onSelectionChange(Array.from(new Set([...selectedIds, ...rangeIds])));
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        onSelectionChange(
          selectedIds.includes(id)
            ? selectedIds.filter((selectedId) => selectedId !== id)
            : [...selectedIds, id],
        );
        return;
      }

      onSelectionChange(selectedIds.includes(id) && selectedIds.length === 1 ? [] : [id]);
    },
    [images, onSelectionChange, selectedIds],
  );

  const isFull = images.length >= PDF_STUDIO_MAX_IMAGES;
  const hasSelection = selectedIds.length > 0;
  const cropTarget = cropTargetId ? images.find((img) => img.id === cropTargetId) : undefined;

  return (
    <>
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
                : "border-[var(--border-strong)] bg-[var(--surface-soft)] hover:border-[var(--accent)] hover:bg-white",
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
                JPG, PNG, WEBP, HEIC · up to {PDF_STUDIO_MAX_IMAGES} images
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
              accept={PDF_STUDIO_SUPPORTED_EXTENSIONS.join(",")}
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
              accept={PDF_STUDIO_SUPPORTED_EXTENSIONS.join(",")}
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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={selectedIds.length === images.length ? onClearSelection : onSelectAll}
                  className="text-[0.78rem] font-medium text-[var(--foreground-soft)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--foreground)]"
                >
                  {selectedIds.length === images.length ? "Clear selection" : "Select all"}
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[0.78rem] font-medium text-[var(--foreground-soft)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--danger)]"
                >
                  Clear all
                </button>
              </div>
            </div>

            {hasSelection ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-white px-3 py-3 shadow-[var(--shadow-soft)]">
                <p className="mr-2 text-[0.78rem] font-medium text-[var(--foreground)]">
                  {selectedIds.length} selected
                </p>
                <button
                  type="button"
                  onClick={onBatchRotateLeft}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-soft)] bg-white px-3 py-2 text-[0.75rem] font-medium text-[var(--foreground-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                >
                  Rotate left
                </button>
                <button
                  type="button"
                  onClick={onBatchRotateRight}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-soft)] bg-white px-3 py-2 text-[0.75rem] font-medium text-[var(--foreground-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                >
                  Rotate right
                </button>
                <button
                  type="button"
                  onClick={onBatchDelete}
                  className="inline-flex items-center justify-center rounded-full border border-[rgba(220,38,38,0.18)] bg-white px-3 py-2 text-[0.75rem] font-medium text-[var(--danger)] transition-colors hover:bg-[rgba(220,38,38,0.05)]"
                >
                  Delete selected
                </button>
              </div>
            ) : null}

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
                      isSelected={selectedIds.includes(item.id)}
                      onRotateLeft={handleRotateLeft}
                      onRotateRight={handleRotateRight}
                      onCrop={handleCropOpen}
                      onDelete={handleDelete}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : null}
      </div>

      {cropTarget ? (
        <CropEditorDialog
          item={cropTarget}
          onApply={handleCropApply}
          onClose={handleCropClose}
        />
      ) : null}
    </>
  );
}
