import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PdfPageGrid, type PageGridItem } from "@/features/docs/pdf-studio/components/shared/pdf-page-grid";

// @dnd-kit requires a DndContext provider. The PdfPageGrid wraps its own.

function makeItem(overrides: Partial<PageGridItem> = {}): PageGridItem {
  return {
    id: "page-1",
    pageIndex: 0,
    previewBytes: 100,
    previewUrl: "data:image/png;base64,abc",
    widthPt: 612,
    heightPt: 792,
    sourcePdfName: "test.pdf",
    originalPageNumber: 1,
    rotation: 0,
    sourceDocumentId: "doc-1",
    sourceLabel: "Test File",
    ...overrides,
  };
}

describe("PdfPageGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no pages", () => {
    render(<PdfPageGrid pages={[]} mode="preview" />);
    expect(screen.getByText(/No pages to display/i)).toBeInTheDocument();
  });

  it("renders page thumbnails with Output numbering", () => {
    const pages = [makeItem(), makeItem({ id: "page-2", pageIndex: 1, originalPageNumber: 2 })];
    render(<PdfPageGrid pages={pages} mode="preview" />);
    expect(screen.getByText("Output 1")).toBeInTheDocument();
    expect(screen.getByText("Output 2")).toBeInTheDocument();
  });

  it("renders source label on each page", () => {
    const pages = [makeItem()];
    render(<PdfPageGrid pages={pages} mode="preview" />);
    expect(screen.getByText("Test File")).toBeInTheDocument();
  });

  it("renders rotate button when onRotate is provided in reorder mode", () => {
    const pages = [makeItem()];
    const onRotate = vi.fn();
    render(<PdfPageGrid pages={pages} mode="reorder" onRotate={onRotate} />);
    expect(screen.getByTitle("Rotate 90°")).toBeInTheDocument();
  });

  it("renders delete button when onDeletePage is provided in reorder mode", () => {
    const pages = [makeItem()];
    const onDelete = vi.fn();
    render(<PdfPageGrid pages={pages} mode="reorder" onDeletePage={onDelete} />);
    expect(screen.getByTitle("Delete page")).toBeInTheDocument();
  });

  it("preview area carries the drag-to-reorder title in reorder mode", () => {
    const pages = [makeItem()];
    render(<PdfPageGrid pages={pages} mode="reorder" />);
    expect(screen.getByTitle("Drag to reorder")).toBeInTheDocument();
  });

  it("preview area has cursor-grab class in reorder mode", () => {
    const pages = [makeItem()];
    render(<PdfPageGrid pages={pages} mode="reorder" />);
    const previewZone = screen.getByTitle("Drag to reorder");
    expect(previewZone.className).toContain("cursor-grab");
  });

  it("preview area does not have cursor-grab in non-reorder modes", () => {
    const pages = [makeItem()];
    render(<PdfPageGrid pages={pages} mode="preview" />);
    // No element with drag-to-reorder title in preview mode
    expect(screen.queryByTitle("Drag to reorder")).not.toBeInTheDocument();
    // The image container should not carry cursor-grab
    const img = screen.getByAltText("Page 1");
    expect(img.parentElement?.className).not.toContain("cursor-grab");
  });

  // sortable.attributes (tabIndex, aria-*) go on the outer card; the footer
  // blocks propagation so drag only fires from the preview area.
  it("outer card carries dnd-kit tabIndex in reorder mode", () => {
    const pages = [makeItem()];
    render(<PdfPageGrid pages={pages} mode="reorder" />);
    const previewZone = screen.getByTitle("Drag to reorder");
    const card = previewZone.parentElement!;
    expect(card.getAttribute("tabindex")).toBe("0");
  });

  it("rotate button fires callback without triggering drag", () => {
    const pages = [makeItem()];
    const onRotate = vi.fn();
    render(<PdfPageGrid pages={pages} mode="reorder" onRotate={onRotate} />);
    const btn = screen.getByTitle("Rotate 90°");
    fireEvent.pointerDown(btn);
    fireEvent.click(btn);
    expect(onRotate).toHaveBeenCalledWith("page-1");
    expect(onRotate).toHaveBeenCalledTimes(1);
  });

  it("delete button fires callback without triggering drag", () => {
    const pages = [makeItem()];
    const onDelete = vi.fn();
    render(<PdfPageGrid pages={pages} mode="reorder" onDeletePage={onDelete} />);
    const btn = screen.getByTitle("Delete page");
    fireEvent.pointerDown(btn);
    fireEvent.click(btn);
    expect(onDelete).toHaveBeenCalledWith("page-1");
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("does not render rotate or delete buttons in preview mode", () => {
    const pages = [makeItem()];
    render(<PdfPageGrid pages={pages} mode="preview" />);
    expect(screen.queryByTitle("Rotate 90°")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Delete page")).not.toBeInTheDocument();
  });

  it("renders rotation style on pages with non-zero rotation", () => {
    const pages = [makeItem({ rotation: 90 })];
    render(<PdfPageGrid pages={pages} mode="preview" />);
    const img = screen.getByAltText("Page 1");
    expect(img).toHaveAttribute("style");
    expect(img.getAttribute("style")).toContain("rotate(90deg)");
  });
});
