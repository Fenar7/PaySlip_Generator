import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OcrProgressPanel } from "./ocr-progress-panel";
import type { ImageItem } from "@/features/docs/pdf-studio/types";

function makeImage(partial: Partial<ImageItem> = {}): ImageItem {
  return {
    id: "img-1",
    previewUrl: "data:image/png;base64,abc",
    rotation: 0,
    name: "scan.png",
    sizeBytes: 100,
    ...partial,
  };
}

describe("OcrProgressPanel", () => {
  it("surfaces low-confidence completed OCR separately from failures", () => {
    render(
      <OcrProgressPanel
        images={[
          makeImage({
            id: "low",
            name: "low.png",
            ocrStatus: "complete",
            ocrText: "text",
            ocrConfidence: 62,
          }),
          makeImage({
            id: "good",
            name: "good.png",
            ocrStatus: "complete",
            ocrText: "text",
            ocrConfidence: 91,
          }),
        ]}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("1 Low confidence")).toBeInTheDocument();
    expect(screen.getByText(/completed with low OCR confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/low\.png — 62% confidence/i)).toBeInTheDocument();
    expect(screen.queryByText(/1 Failed/i)).not.toBeInTheDocument();
  });
});
