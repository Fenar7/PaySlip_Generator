import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OcrProgressPanel } from "@/features/docs/pdf-studio/components/ocr-progress-panel";
import type { ImageItem } from "@/features/docs/pdf-studio/types";

function makeImage(overrides: Partial<ImageItem> = {}): ImageItem {
  return {
    id: "img-1",
    previewUrl: "data:image/png;base64,abc",
    rotation: 0,
    name: "page.png",
    sizeBytes: 1024,
    ...overrides,
  };
}

describe("OcrProgressPanel", () => {
  it("renders nothing when there are no images with OCR state", () => {
    const { container } = render(<OcrProgressPanel images={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when all images are complete with acceptable confidence", () => {
    const images = [makeImage({ ocrStatus: "complete", ocrConfidence: 85 })];
    const { container } = render(<OcrProgressPanel images={images} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the correct language label in the processing message", () => {
    const images = [makeImage({ ocrStatus: "processing" })];
    render(<OcrProgressPanel images={images} language="fra" />);
    expect(screen.getByText(/French OCR runs locally/)).toBeInTheDocument();
  });

  it("falls back to the raw code for unknown languages", () => {
    const images = [makeImage({ ocrStatus: "processing" })];
    render(<OcrProgressPanel images={images} language="xyz" />);
    expect(screen.getByText(/xyz OCR runs locally/)).toBeInTheDocument();
  });

  it("shows counts for mixed states", () => {
    const images = [
      makeImage({ id: "a", ocrStatus: "processing" }),
      makeImage({ id: "b", ocrStatus: "pending" }),
      makeImage({ id: "c", ocrStatus: "complete", ocrConfidence: 85 }),
      makeImage({ id: "d", ocrStatus: "error" }),
      makeImage({ id: "e", ocrStatus: "cancelled" }),
      makeImage({ id: "f", ocrStatus: "complete", ocrConfidence: 50 }),
    ];
    render(<OcrProgressPanel images={images} />);
    expect(screen.getByText(/1 Processing/)).toBeInTheDocument();
    expect(screen.getByText(/1 Pending/)).toBeInTheDocument();
    expect(screen.getByText(/1 Failed/)).toBeInTheDocument();
    expect(screen.getByText(/1 Cancelled/)).toBeInTheDocument();
    expect(screen.getByText(/2 Complete/)).toBeInTheDocument();
    expect(screen.getByText(/1 Low confidence/)).toBeInTheDocument();
  });

  it("shows the cancel button while processing", () => {
    const images = [makeImage({ ocrStatus: "processing" })];
    const onCancel = vi.fn();
    render(<OcrProgressPanel images={images} onCancelOcr={onCancel} />);
    expect(screen.getByRole("button", { name: /Cancel OCR/i })).toBeInTheDocument();
  });

  it("hides the cancel button when nothing is processing", () => {
    const images = [makeImage({ ocrStatus: "error" })];
    const onCancel = vi.fn();
    render(<OcrProgressPanel images={images} onCancelOcr={onCancel} />);
    expect(screen.queryByRole("button", { name: /Cancel OCR/i })).not.toBeInTheDocument();
  });

  it("fires onCancelOcr when cancel is clicked", () => {
    const images = [makeImage({ ocrStatus: "processing" })];
    const onCancel = vi.fn();
    render(<OcrProgressPanel images={images} onCancelOcr={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /Cancel OCR/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows retry list for failed and cancelled images", () => {
    const images = [
      makeImage({ id: "a", ocrStatus: "error", ocrErrorMessage: "Network error" }),
      makeImage({ id: "b", ocrStatus: "cancelled" }),
    ];
    const onRetry = vi.fn();
    render(<OcrProgressPanel images={images} onRetry={onRetry} onRetryAll={vi.fn()} />);
    expect(screen.getByText(/2 images need OCR/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry all/i })).toBeInTheDocument();
    // Exact "Retry" buttons (not "Retry all")
    expect(screen.getAllByRole("button", { name: /^Retry$/i })).toHaveLength(2);
  });

  it("fires onRetry with the correct image id", () => {
    const images = [
      makeImage({ id: "a", ocrStatus: "error", ocrErrorMessage: "Oops" }),
    ];
    const onRetry = vi.fn();
    render(<OcrProgressPanel images={images} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalledWith("a");
  });

  it("fires onRetryAll when Retry all is clicked", () => {
    const images = [
      makeImage({ id: "a", ocrStatus: "error" }),
      makeImage({ id: "b", ocrStatus: "cancelled" }),
    ];
    const onRetryAll = vi.fn();
    render(<OcrProgressPanel images={images} onRetryAll={onRetryAll} />);
    fireEvent.click(screen.getByRole("button", { name: /Retry all/i }));
    expect(onRetryAll).toHaveBeenCalledTimes(1);
  });

  it("includes low-confidence images in the retry list", () => {
    const images = [
      makeImage({ id: "a", ocrStatus: "complete", ocrConfidence: 50 }),
    ];
    const onRetry = vi.fn();
    render(<OcrProgressPanel images={images} onRetry={onRetry} lowConfidenceThreshold={70} />);
    expect(screen.getByText(/1 image needs OCR/)).toBeInTheDocument();
    expect(screen.getByText(/Low confidence \(50%\)/)).toBeInTheDocument();
  });

  it("shows the unavailable banner when OCR service is unavailable", () => {
    const images = [makeImage({ ocrStatus: "error" })];
    render(<OcrProgressPanel images={images} isOcrUnavailable />);
    expect(screen.getByText(/OCR unavailable/)).toBeInTheDocument();
  });
});
