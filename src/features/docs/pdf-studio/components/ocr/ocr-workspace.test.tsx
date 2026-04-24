import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { OcrWorkspace } from "@/features/docs/pdf-studio/components/ocr/ocr-workspace";

// --- Mocks ---

let mockPlanId = "starter";

vi.mock("@/hooks/use-active-org", () => ({
  useActiveOrg: () => ({ activeOrg: { id: "org-ocr" }, isLoading: false }),
}));

vi.mock("@/hooks/use-plan", () => ({
  usePlan: () => ({ plan: { planId: mockPlanId } }),
}));

vi.mock("@/features/docs/pdf-studio/lib/analytics", () => ({
  usePdfStudioAnalytics: () => ({
    surface: "workspace",
    trackUpload: vi.fn(),
    trackStart: vi.fn(),
    trackSuccess: vi.fn(),
    trackFail: vi.fn(),
    trackUpgradeIntent: vi.fn(),
  }),
}));

vi.mock("@/features/docs/pdf-studio/utils/ocr-processor", () => ({
  cancelAllOcr: vi.fn(),
  getOcrServiceStatus: () => "ready",
  processImageForOcrDetailed: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/utils/scan-input", () => ({
  loadScanSourcePages: vi.fn(),
  buildImageItemsFromScanPages: vi.fn(),
  dataUrlToBlob: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/utils/pdf-generator", () => ({
  generatePdfFromImages: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/utils/zip-builder", () => ({
  downloadBlob: vi.fn(),
  downloadPdfBytes: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/utils/session-storage", () => ({
  loadOcrWorkspaceSession: vi.fn(),
  saveOcrWorkspaceSession: vi.fn(),
  clearOcrWorkspaceSession: vi.fn(),
}));

import { processImageForOcrDetailed } from "@/features/docs/pdf-studio/utils/ocr-processor";
import { loadOcrWorkspaceSession, clearOcrWorkspaceSession } from "@/features/docs/pdf-studio/utils/session-storage";
import { loadScanSourcePages, buildImageItemsFromScanPages, dataUrlToBlob } from "@/features/docs/pdf-studio/utils/scan-input";

function getFileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe("OcrWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlanId = "starter";
  });

  it("renders the upload zone and OCR settings panel", () => {
    render(<OcrWorkspace />);
    expect(screen.getByText(/OCR PDF & Images/i)).toBeInTheDocument();
    expect(screen.getByText(/OCR Settings/i)).toBeInTheDocument();
  });

  it("shows plan-limit messaging for starter when near the limit", async () => {
    const mockPages = Array.from({ length: 9 }, (_, i) => ({
      id: `page-${i}`,
      previewUrl: "data:image/png;base64,abc",
      name: `page-${i}.png`,
    }));

    vi.mocked(loadScanSourcePages).mockResolvedValue({
      ok: true,
      pages: mockPages as unknown as Array<{ previewUrl: string; name: string }>,
      fileClass: "pdf",
    } as unknown as Awaited<ReturnType<typeof loadScanSourcePages>>);

    vi.mocked(buildImageItemsFromScanPages).mockReturnValue(
      mockPages.map((p) => ({
        id: p.id,
        previewUrl: p.previewUrl,
        rotation: 0,
        name: p.name,
        sizeBytes: 1024,
      })),
    );

    const { container } = render(<OcrWorkspace />);

    const file = new File(["dummy"], "scan.pdf", { type: "application/pdf" });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Starter covers OCR up to/i)).toBeInTheDocument();
    });
  });

  it("shows scope selector after upload", async () => {
    vi.mocked(loadScanSourcePages).mockResolvedValue({
      ok: true,
      pages: [{ previewUrl: "data:image/png;base64,abc", name: "page.png" }],
      fileClass: "image",
    } as unknown as Awaited<ReturnType<typeof loadScanSourcePages>>);

    vi.mocked(buildImageItemsFromScanPages).mockReturnValue([
      {
        id: "img-1",
        previewUrl: "data:image/png;base64,abc",
        rotation: 0,
        name: "page.png",
        sizeBytes: 1024,
      },
    ]);

    const { container } = render(<OcrWorkspace />);

    const file = new File(["dummy"], "scan.png", { type: "image/png" });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByLabelText(/OCR run scope/i)).toBeInTheDocument();
    });
  });

  it("runs OCR on all pages when scope is 'all'", async () => {
    vi.mocked(loadScanSourcePages).mockResolvedValue({
      ok: true,
      pages: [
        { previewUrl: "data:image/png;base64,a", name: "page1.png" },
        { previewUrl: "data:image/png;base64,b", name: "page2.png" },
      ],
      fileClass: "pdf",
    } as unknown as Awaited<ReturnType<typeof loadScanSourcePages>>);

    vi.mocked(buildImageItemsFromScanPages).mockReturnValue([
      { id: "a", previewUrl: "data:image/png;base64,a", rotation: 0, name: "page1.png", sizeBytes: 1024 },
      { id: "b", previewUrl: "data:image/png;base64,b", rotation: 0, name: "page2.png", sizeBytes: 1024 },
    ]);

    vi.mocked(dataUrlToBlob).mockReturnValue(new Blob(["x"]));
    vi.mocked(processImageForOcrDetailed).mockResolvedValue({
      text: "hello",
      confidence: 85,
      language: "eng",
      mode: "accurate",
    });

    const { container } = render(<OcrWorkspace />);

    const file = new File(["dummy"], "scan.pdf", { type: "application/pdf" });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start OCR/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Start OCR/i }));

    await waitFor(() => {
      expect(processImageForOcrDetailed).toHaveBeenCalledTimes(2);
    });
  });

  it("skips completed pages when scope is 'remaining'", async () => {
    vi.mocked(loadScanSourcePages).mockResolvedValue({
      ok: true,
      pages: [
        { previewUrl: "data:image/png;base64,a", name: "page1.png" },
        { previewUrl: "data:image/png;base64,b", name: "page2.png" },
      ],
      fileClass: "pdf",
    } as unknown as Awaited<ReturnType<typeof loadScanSourcePages>>);

    vi.mocked(buildImageItemsFromScanPages).mockReturnValue([
      { id: "a", previewUrl: "data:image/png;base64,a", rotation: 0, name: "page1.png", sizeBytes: 1024, ocrStatus: "complete", ocrText: "done", ocrConfidence: 90 },
      { id: "b", previewUrl: "data:image/png;base64,b", rotation: 0, name: "page2.png", sizeBytes: 1024, ocrStatus: "error" },
    ]);

    vi.mocked(dataUrlToBlob).mockReturnValue(new Blob(["x"]));
    vi.mocked(processImageForOcrDetailed).mockResolvedValue({
      text: "hello",
      confidence: 85,
      language: "eng",
      mode: "accurate",
    });

    const { container } = render(<OcrWorkspace />);

    const file = new File(["dummy"], "scan.pdf", { type: "application/pdf" });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByLabelText(/OCR run scope/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/OCR run scope/i), { target: { value: "remaining" } });
    fireEvent.click(screen.getByRole("button", { name: /Start OCR/i }));

    await waitFor(() => {
      expect(processImageForOcrDetailed).toHaveBeenCalledTimes(1);
    });

    expect(processImageForOcrDetailed).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ dedupeKey: "b" }),
    );
  });

  it("fires handleRetry for a single failed image", async () => {
    vi.mocked(loadScanSourcePages).mockResolvedValue({
      ok: true,
      pages: [{ previewUrl: "data:image/png;base64,a", name: "page1.png" }],
      fileClass: "image",
    } as unknown as Awaited<ReturnType<typeof loadScanSourcePages>>);

    vi.mocked(buildImageItemsFromScanPages).mockReturnValue([
      { id: "a", previewUrl: "data:image/png;base64,a", rotation: 0, name: "page1.png", sizeBytes: 1024, ocrStatus: "error", ocrErrorMessage: "Failed" },
    ]);

    vi.mocked(dataUrlToBlob).mockReturnValue(new Blob(["x"]));
    vi.mocked(processImageForOcrDetailed).mockResolvedValue({
      text: "fixed",
      confidence: 90,
      language: "eng",
      mode: "accurate",
    });

    const { container } = render(<OcrWorkspace />);

    const file = new File(["dummy"], "scan.png", { type: "image/png" });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => {
      expect(processImageForOcrDetailed).toHaveBeenCalledTimes(1);
    });
  });

  it("shows honest Pro page limit copy (no hardcoded 30)", async () => {
    mockPlanId = "pro";

    vi.mocked(loadScanSourcePages).mockResolvedValue({
      ok: true,
      pages: [{ previewUrl: "data:image/png;base64,a", name: "page.png" }],
      fileClass: "image",
    } as unknown as Awaited<ReturnType<typeof loadScanSourcePages>>);

    vi.mocked(buildImageItemsFromScanPages).mockReturnValue([
      { id: "a", previewUrl: "data:image/png;base64,a", rotation: 0, name: "page.png", sizeBytes: 1024 },
    ]);

    const { container } = render(<OcrWorkspace />);

    const file = new File(["dummy"], "scan.png", { type: "image/png" });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/no page limit/i)).toBeInTheDocument();
    });
  });

  it("restores session on mount and shows specific OCR restore messaging", async () => {
    vi.mocked(loadOcrWorkspaceSession).mockReturnValue({
      images: [
        { id: "a", previewUrl: "data:image/png;base64,a", rotation: 0, name: "page1.png", sizeBytes: 1024, ocrStatus: "complete", ocrText: "hello", ocrConfidence: 85 },
        { id: "b", previewUrl: "data:image/png;base64,b", rotation: 0, name: "page2.png", sizeBytes: 1024 },
      ],
      language: "fra",
      mode: "fast",
      confidenceThreshold: 80,
      savedAt: new Date().toISOString(),
    });

    render(<OcrWorkspace />);

    await waitFor(() => {
      expect(screen.getByText(/1 page has restored OCR text\. 1 page needs OCR rerun/i)).toBeInTheDocument();
    });
  });

  it("shows fully-restored messaging when all pages have OCR text", async () => {
    vi.mocked(loadOcrWorkspaceSession).mockReturnValue({
      images: [
        { id: "a", previewUrl: "data:image/png;base64,a", rotation: 0, name: "page1.png", sizeBytes: 1024, ocrStatus: "complete", ocrText: "hello", ocrConfidence: 85 },
      ],
      savedAt: new Date().toISOString(),
    });

    render(<OcrWorkspace />);

    await waitFor(() => {
      expect(screen.getByText(/OCR text restored for all 1 page/i)).toBeInTheDocument();
    });
  });

  it("clears session on new file upload", async () => {
    vi.mocked(loadOcrWorkspaceSession).mockReturnValue({
      images: [
        { id: "a", previewUrl: "data:image/png;base64,a", rotation: 0, name: "page1.png", sizeBytes: 1024, ocrStatus: "complete", ocrText: "hello", ocrConfidence: 85 },
      ],
      savedAt: new Date().toISOString(),
    });

    vi.mocked(loadScanSourcePages).mockResolvedValue({
      ok: true,
      pages: [{ previewUrl: "data:image/png;base64,b", name: "new.png" }],
      fileClass: "image",
    } as unknown as Awaited<ReturnType<typeof loadScanSourcePages>>);

    vi.mocked(buildImageItemsFromScanPages).mockReturnValue([
      { id: "b", previewUrl: "data:image/png;base64,b", rotation: 0, name: "new.png", sizeBytes: 1024 },
    ]);

    const { container } = render(<OcrWorkspace />);

    await waitFor(() => {
      expect(screen.getByText(/OCR text restored for all 1 page/i)).toBeInTheDocument();
    });

    const file = new File(["dummy"], "new.png", { type: "image/png" });
    const input = getFileInput(container);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(clearOcrWorkspaceSession).toHaveBeenCalledWith("org-ocr");
    });
  });
});
