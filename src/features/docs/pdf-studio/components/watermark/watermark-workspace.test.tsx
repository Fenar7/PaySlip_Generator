import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WatermarkWorkspace } from "./watermark-workspace";

const mocks = vi.hoisted(() => ({
  trackStart: vi.fn(),
  trackSuccess: vi.fn(),
  trackFail: vi.fn(),
  trackUpload: vi.fn(),
  setError: vi.fn(),
  onFileSelect: vi.fn(),
  applyWatermarkToPdf: vi.fn(),
  downloadPdfBytes: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/analytics", () => ({
  usePdfStudioAnalytics: () => ({
    trackStart: mocks.trackStart,
    trackSuccess: mocks.trackSuccess,
    trackFail: mocks.trackFail,
    trackUpload: mocks.trackUpload,
  }),
}));

vi.mock("@/features/docs/pdf-studio/components/shared/use-single-pdf-upload", () => ({
  useSinglePdfUpload: vi.fn(() => ({
    file: null,
    pdfBytes: null,
    pages: [],
    loading: false,
    error: null,
    setError: mocks.setError,
    setFile: vi.fn(),
    setPdfBytes: vi.fn(),
    setPages: vi.fn(),
    onFileSelect: mocks.onFileSelect,
  })),
}));

vi.mock("@/features/docs/pdf-studio/components/shared/pdf-page-preview-panel", () => ({
  PdfPagePreviewPanel: ({ overlay }: { overlay?: React.ReactNode }) => (
    <div data-testid="pdf-preview">
      {overlay ? <div data-testid="preview-overlay">{overlay}</div> : null}
    </div>
  ),
}));

vi.mock("@/features/docs/pdf-studio/utils/pdf-watermark-writer", () => ({
  applyWatermarkToPdf: mocks.applyWatermarkToPdf,
}));

vi.mock("@/features/docs/pdf-studio/utils/zip-builder", () => ({
  downloadPdfBytes: mocks.downloadPdfBytes,
}));

vi.mock("@/features/docs/pdf-studio/lib/output", () => ({
  buildPdfStudioOutputName: ({ toolId, baseName }: { toolId: string; baseName: string }) =>
    `${baseName}-${toolId}.pdf`,
}));

import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";

function mockUploadState(overrides: Partial<ReturnType<typeof useSinglePdfUpload>> = {}) {
  return {
    file: null,
    pdfBytes: null,
    pages: [],
    loading: false,
    error: null,
    setError: mocks.setError,
    setFile: vi.fn(),
    setPdfBytes: vi.fn(),
    setPages: vi.fn(),
    onFileSelect: mocks.onFileSelect,
    ...overrides,
  };
}

describe("WatermarkWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload zone when no file is selected", () => {
    render(<WatermarkWorkspace />);

    expect(screen.getByText("Upload a PDF to watermark")).toBeInTheDocument();
    expect(screen.getByText("One PDF per run, up to 200 pages")).toBeInTheDocument();
  });

  it("renders controls and preview when a file is uploaded", () => {
    (useSinglePdfUpload as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUploadState({
        file: new File(["pdf"], "test.pdf", { type: "application/pdf" }),
        pdfBytes: new Uint8Array([1, 2, 3]),
        pages: [{ pageIndex: 0, previewUrl: "data:image/png;base64,abc" }],
      }),
    );

    render(<WatermarkWorkspace />);

    expect(screen.getByText("test.pdf")).toBeInTheDocument();
    expect(screen.getByText("1 pages")).toBeInTheDocument();
    expect(screen.getByText("Presets")).toBeInTheDocument();
    expect(screen.getByText("Position")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-preview")).toBeInTheDocument();
  });

  it("applies a preset when clicked", () => {
    (useSinglePdfUpload as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUploadState({
        file: new File(["pdf"], "test.pdf", { type: "application/pdf" }),
        pdfBytes: new Uint8Array([1, 2, 3]),
        pages: [{ pageIndex: 0, previewUrl: "data:image/png;base64,abc" }],
      }),
    );

    render(<WatermarkWorkspace />);

    const draftButton = screen.getByText("Draft");
    fireEvent.click(draftButton);

    const textInput = screen.getByDisplayValue("DRAFT") as HTMLInputElement;
    expect(textInput.value).toBe("DRAFT");
  });

  it("updates position when position grid button is clicked", () => {
    (useSinglePdfUpload as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUploadState({
        file: new File(["pdf"], "test.pdf", { type: "application/pdf" }),
        pdfBytes: new Uint8Array([1, 2, 3]),
        pages: [{ pageIndex: 0, previewUrl: "data:image/png;base64,abc" }],
      }),
    );

    render(<WatermarkWorkspace />);

    const topRightButton = screen.getByText("TR");
    fireEvent.click(topRightButton);

    expect(topRightButton).toHaveClass("bg-[#1a1a1a]");
  });

  it("shows error message when upload has an error", () => {
    (useSinglePdfUpload as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUploadState({
        file: new File(["pdf"], "test.pdf", { type: "application/pdf" }),
        pdfBytes: new Uint8Array([1, 2, 3]),
        pages: [{ pageIndex: 0, previewUrl: "data:image/png;base64,abc" }],
        error: "PDF is corrupted",
      }),
    );

    render(<WatermarkWorkspace />);

    expect(screen.getByText("PDF is corrupted")).toBeInTheDocument();
  });

  it("applies watermark and downloads on button click", async () => {
    const mockBytes = new Uint8Array([4, 5, 6]);
    mocks.applyWatermarkToPdf.mockResolvedValue(mockBytes);

    (useSinglePdfUpload as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUploadState({
        file: new File(["pdf"], "test.pdf", { type: "application/pdf" }),
        pdfBytes: new Uint8Array([1, 2, 3]),
        pages: [{ pageIndex: 0, previewUrl: "data:image/png;base64,abc" }],
      }),
    );

    render(<WatermarkWorkspace />);

    const applyButton = screen.getByText("Watermark & download");
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mocks.applyWatermarkToPdf).toHaveBeenCalledTimes(1);
      expect(mocks.downloadPdfBytes).toHaveBeenCalledWith(
        mockBytes,
        "test-watermark.pdf",
      );
      expect(mocks.trackSuccess).toHaveBeenCalled();
    });

    expect(screen.getByText("Watermark applied and downloaded successfully.")).toBeInTheDocument();
  });

  it("shows error state when watermark application fails", async () => {
    mocks.applyWatermarkToPdf.mockRejectedValue(new Error("fail"));

    (useSinglePdfUpload as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUploadState({
        file: new File(["pdf"], "test.pdf", { type: "application/pdf" }),
        pdfBytes: new Uint8Array([1, 2, 3]),
        pages: [{ pageIndex: 0, previewUrl: "data:image/png;base64,abc" }],
      }),
    );

    render(<WatermarkWorkspace />);

    const applyButton = screen.getByText("Watermark & download");
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mocks.setError).toHaveBeenCalledWith(
        "Watermarking failed. Try a simpler PDF or switch to a text watermark.",
      );
      expect(mocks.trackFail).toHaveBeenCalled();
    });
  });

  it("resets watermark settings when reset is clicked", () => {
    (useSinglePdfUpload as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUploadState({
        file: new File(["pdf"], "test.pdf", { type: "application/pdf" }),
        pdfBytes: new Uint8Array([1, 2, 3]),
        pages: [{ pageIndex: 0, previewUrl: "data:image/png;base64,abc" }],
      }),
    );

    render(<WatermarkWorkspace />);

    const textInput = screen.getByDisplayValue("CONFIDENTIAL") as HTMLInputElement;
    fireEvent.change(textInput, { target: { value: "CHANGED" } });
    expect(textInput.value).toBe("CHANGED");

    const resetButton = screen.getByText("Reset");
    fireEvent.click(resetButton);

    expect(screen.getByDisplayValue("CONFIDENTIAL")).toBeInTheDocument();
  });
});
