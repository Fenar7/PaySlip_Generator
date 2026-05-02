import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MergeWorkspace } from "@/features/docs/pdf-studio/components/merge/merge-workspace";

vi.mock("@/features/docs/pdf-studio/lib/analytics", () => ({ usePdfStudioAnalytics: () => ({ trackUpload: vi.fn(), trackStart: vi.fn(), trackSuccess: vi.fn(), trackFail: vi.fn() }) }));
vi.mock("@/features/docs/pdf-studio/utils/pdf-reader", () => ({ getPdfPageCount: vi.fn(async () => ({ ok: true, pageCount: 2 })), readPdfPages: vi.fn(async () => ({ ok: true, data: [{ pageIndex: 0, previewBytes: 100, previewUrl: "data:image/png;base64,a", widthPt: 612, heightPt: 792, sourcePdfName: "t.pdf" }, { pageIndex: 1, previewBytes: 100, previewUrl: "data:image/png;base64,b", widthPt: 612, heightPt: 792, sourcePdfName: "t.pdf" }] })) }));
vi.mock("@/features/docs/pdf-studio/utils/zip-builder", () => ({ downloadPdfBytes: vi.fn() }));
vi.mock("@/features/docs/pdf-studio/utils/merge-session-storage", () => ({ loadMergeSession: vi.fn(() => null), saveMergeSession: vi.fn(() => true), clearMergeSession: vi.fn(), buildMergeRestoreMessage: vi.fn(() => "Restored") }));
vi.mock("@/features/docs/pdf-studio/utils/pdf-page-operations", () => ({ buildPdfSourceDocument: vi.fn((o: { name: string }) => ({ id: "d-" + o.name, name: o.name, bytes: new Uint8Array(), pages: [], sourceLabel: o.name })), buildPdfPageDescriptors: vi.fn((ds: Array<{ id: string }>) => ds.flatMap((d) => [{ id: d.id + "-p1", pageIndex: 0, originalPageNumber: 1, rotation: 0, sourceDocumentId: d.id, sourceLabel: d.id, sourcePdfName: "t.pdf", previewUrl: "data:image/png;base64,x", previewBytes: 100, widthPt: 612, heightPt: 792 }, { id: d.id + "-p2", pageIndex: 1, originalPageNumber: 2, rotation: 0, sourceDocumentId: d.id, sourceLabel: d.id, sourcePdfName: "t.pdf", previewUrl: "data:image/png;base64,y", previewBytes: 100, widthPt: 612, heightPt: 792 }])), exportPdfFromPageDescriptors: vi.fn(async () => new Uint8Array()) }));

describe("MergeWorkspace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders header and upload zone", () => {
    render(<MergeWorkspace />);
    expect(screen.getByText(/Merge PDFs/i)).toBeInTheDocument();
    expect(screen.getByText(/Drop your PDFs here/i)).toBeInTheDocument();
  });

  it("shows reorder guidance", () => {
    render(<MergeWorkspace />);
    expect(screen.getByText(/Combine multiple PDFs into one/i)).toBeInTheDocument();
  });

  it("shows session restore when available", async () => {
    const mod = await import("@/features/docs/pdf-studio/utils/merge-session-storage");
    vi.mocked(mod.loadMergeSession).mockReturnValue({ filename: "r.pdf", pages: [{ id: "rp", pageIndex: 0, originalPageNumber: 1, rotation: 0, sourceDocumentId: "d1", sourceLabel: "rpt", sourcePdfName: "rpt.pdf" }], sources: [{ id: "d1", name: "rpt.pdf", sourceLabel: "rpt", pageCount: 1 }], savedAt: new Date().toISOString() });
    render(<MergeWorkspace />);
    await waitFor(() => expect(screen.getByText("Restored")).toBeInTheDocument());
  });

  it("shows back link", () => {
    render(<MergeWorkspace />);
    expect(screen.getByText(/Back to PDF Studio/i)).toBeInTheDocument();
  });
});
