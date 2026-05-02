import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PdfPageGrid, type PageGridItem } from "@/features/docs/pdf-studio/components/shared/pdf-page-grid";

function makeItem(o: Partial<PageGridItem> = {}): PageGridItem {
  return { id: "p1", pageIndex: 0, previewBytes: 100, previewUrl: "data:image/png;base64,a", widthPt: 612, heightPt: 792, sourcePdfName: "t.pdf", originalPageNumber: 1, rotation: 0, sourceDocumentId: "d1", sourceLabel: "Test", ...o };
}

describe("PdfPageGrid", () => {
  beforeEach(() => vi.clearAllMocks());

  it("empty state", () => {
    render(<PdfPageGrid pages={[]} mode="preview" />);
    expect(screen.getByText(/No pages/i)).toBeInTheDocument();
  });

  it("renders output numbers", () => {
    render(<PdfPageGrid pages={[makeItem(), makeItem({ id: "p2", pageIndex: 1, originalPageNumber: 2 })]} mode="preview" />);
    expect(screen.getByText("Output 1")).toBeInTheDocument();
    expect(screen.getByText("Output 2")).toBeInTheDocument();
  });

  it("source label shown", () => {
    render(<PdfPageGrid pages={[makeItem()]} mode="preview" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("rotate button in reorder mode", () => {
    render(<PdfPageGrid pages={[makeItem()]} mode="reorder" onRotate={vi.fn()} />);
    expect(screen.getByTitle("Rotate 90°")).toBeInTheDocument();
  });

  it("delete button in reorder mode", () => {
    render(<PdfPageGrid pages={[makeItem()]} mode="reorder" onDeletePage={vi.fn()} />);
    expect(screen.getByTitle("Delete page")).toBeInTheDocument();
  });

  it("drag handle in reorder mode", () => {
    render(<PdfPageGrid pages={[makeItem()]} mode="reorder" />);
    expect(screen.getByTitle("Drag to reorder")).toBeInTheDocument();
  });

  it("no buttons in preview mode", () => {
    render(<PdfPageGrid pages={[makeItem()]} mode="preview" />);
    expect(screen.queryByTitle("Rotate 90°")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Delete page")).not.toBeInTheDocument();
  });

  it("rotation style applied", () => {
    render(<PdfPageGrid pages={[makeItem({ rotation: 90 })]} mode="preview" />);
    expect(screen.getByAltText("Page 1").getAttribute("style")).toContain("rotate(90deg)");
  });
});
