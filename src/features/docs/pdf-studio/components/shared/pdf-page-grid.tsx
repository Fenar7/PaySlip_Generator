"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { PdfPageItem } from "@/features/docs/pdf-studio/utils/pdf-reader";

export interface PageGridItem extends PdfPageItem {
  id: string;
  originalPageNumber?: number;
  rotation?: number;
  sourceDocumentId?: string;
  sourceLabel?: string;
}

interface PdfPageThumbnailProps {
  item: PageGridItem;
  index: number;
  mode: "select" | "reorder" | "delete" | "preview";
  isSelected?: boolean;
  isMarkedForDeletion?: boolean;
  onToggleSelect?: (id: string) => void;
  onRotate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/* eslint-disable react-hooks/refs */
function PdfPageThumbnail({
  item,
  index,
  mode,
  isSelected = false,
  isMarkedForDeletion = false,
  onToggleSelect,
  onRotate,
  onDelete,
}: PdfPageThumbnailProps) {
  const sortable = useSortable({
    id: item.id,
    disabled: mode === "select" || mode === "delete" || mode === "preview",
  });

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  const handleClick = () => {
    if (mode === "select") onToggleSelect?.(item.id);
    if (mode === "delete") onToggleSelect?.(item.id);
  };

  const previewStyle =
    item.rotation && item.rotation !== 0
      ? {
          transform: `rotate(${item.rotation}deg)`,
          transition: "transform 200ms ease",
        }
      : undefined;

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      // sortable.listeners activates drag from anywhere on the card.
      // The footer blocks propagation so drag only fires from the preview area.
      {...(mode === "reorder" ? sortable.attributes : {})}
      {...(mode === "reorder" ? sortable.listeners : {})}
      className={cn(
        "group relative flex flex-col rounded-xl border bg-white shadow-sm transition-all",
        sortable.isDragging
          ? "z-50 shadow-lg ring-2 ring-[var(--accent)] ring-offset-2"
          : isMarkedForDeletion
            ? "border-red-400 ring-2 ring-red-200"
            : isSelected
              ? "border-[var(--accent)] ring-2 ring-[rgba(220,38,38,0.15)]"
              : "border-[var(--border-soft)] hover:shadow-md",
        (mode === "select" || mode === "delete") && "cursor-pointer"
      )}
      onClick={handleClick}
    >
      {/* Preview area: the visual drag zone in reorder mode. */}
      <div
        title={mode === "reorder" ? "Drag to reorder" : undefined}
        className={cn(
          "relative overflow-hidden rounded-t-[0.65rem] bg-[var(--surface-soft)]",
          mode === "reorder" &&
            "cursor-grab select-none active:cursor-grabbing hover:ring-2 hover:ring-inset hover:ring-[var(--accent)]/25",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl}
          alt={`Page ${index + 1}`}
        className={cn(
          "aspect-[3/4] w-full object-contain",
          isMarkedForDeletion && "opacity-30",
        )}
        style={previewStyle}
        draggable={false}
      />
        {isMarkedForDeletion && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
            <span className="text-2xl">🗑️</span>
          </div>
        )}
        {isSelected && !isMarkedForDeletion && (
          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Footer stops pointer propagation so pressing labels/buttons never starts a drag. */}
      <div
        className="space-y-1 px-2 py-1.5"
        onPointerDown={mode === "reorder" ? (e) => e.stopPropagation() : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.65rem] font-medium text-[var(--muted-foreground)]">
            Output {index + 1}
          </span>
          <span className="truncate text-[0.65rem] text-[var(--muted-foreground)]">
            Page {item.originalPageNumber ?? item.pageIndex + 1}
          </span>
        </div>
        {item.sourceLabel ? (
          <p className="truncate text-[0.6rem] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {item.sourceLabel}
          </p>
        ) : null}
        <div className="flex items-center gap-1">
          {mode === "reorder" && (
            <>
              {onRotate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRotate(item.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                  title="Rotate 90°"
                >
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Delete page"
                >
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
              {/* Visual drag affordance only — drag is activated from the preview area above. */}
              <div
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted-foreground)]"
              >
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="9" cy="6" r="1" fill="currentColor" />
                  <circle cx="15" cy="6" r="1" fill="currentColor" />
                  <circle cx="9" cy="12" r="1" fill="currentColor" />
                  <circle cx="15" cy="12" r="1" fill="currentColor" />
                  <circle cx="9" cy="18" r="1" fill="currentColor" />
                  <circle cx="15" cy="18" r="1" fill="currentColor" />
                </svg>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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

interface PdfPageGridProps {
  pages: PageGridItem[];
  mode: "select" | "reorder" | "delete" | "preview";
  selectedIds?: Set<string>;
  deletedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onReorder?: (pages: PageGridItem[]) => void;
  onRotate?: (id: string) => void;
  onDeletePage?: (id: string) => void;
}

export function PdfPageGrid({
  pages,
  mode,
  selectedIds = new Set(),
  deletedIds = new Set(),
  onToggleSelect,
  onReorder,
  onRotate,
  onDeletePage,
}: PdfPageGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(pages, oldIndex, newIndex));
    }
  };

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-6 py-16 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          No pages to display
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={mode === "reorder" ? handleDragEnd : undefined}
    >
      <SortableContext
        items={pages.map((p) => p.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {pages.map((page, idx) => (
            <PdfPageThumbnail
              key={page.id}
              item={page}
              index={idx}
              mode={mode}
              isSelected={selectedIds.has(page.id)}
              isMarkedForDeletion={deletedIds.has(page.id)}
              onToggleSelect={onToggleSelect}
              onRotate={onRotate}
              onDelete={onDeletePage}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
