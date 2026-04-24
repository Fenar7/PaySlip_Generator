import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ImageOrganizer } from "./image-organizer";
import type { ImageItem } from "@/features/docs/pdf-studio/types";

const mocks = vi.hoisted(() => ({
  processImageForOcrDetailed: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/utils/ocr-processor", () => ({
  processImageForOcrDetailed: mocks.processImageForOcrDetailed,
  getOcrServiceStatus: vi.fn(() => "ready"),
}));

vi.mock("@/features/docs/pdf-studio/utils/heic-converter", () => ({
  convertHeicToJpeg: vi.fn((file: File) => Promise.resolve(file)),
}));

vi.mock("@/features/docs/pdf-studio/lib/analytics", () => ({
  trackPdfStudioLifecycleEvent: vi.fn(),
}));

function makeItem(partial: Partial<ImageItem> = {}): ImageItem {
  return {
    id: "img-1",
    file: new File(["image"], "test.png", { type: "image/png" }),
    previewUrl: "data:image/png;base64,abc",
    rotation: 0,
    name: "test.png",
    sizeBytes: 100,
    ...partial,
  };
}

function Harness({ initialImages }: { initialImages: ImageItem[] }) {
  const [images, setImages] = useState(initialImages);

  return (
    <>
      <ImageOrganizer
        images={images}
        onChange={(next) =>
          setImages((current) => (typeof next === "function" ? next(current) : next))
        }
        selectedIds={[]}
        onSelectionChange={vi.fn()}
        onBatchDelete={vi.fn()}
        onBatchRotateLeft={vi.fn()}
        onBatchRotateRight={vi.fn()}
        onSelectAll={vi.fn()}
        onClearSelection={vi.fn()}
      />
      <output data-testid="images">{JSON.stringify(images)}</output>
    </>
  );
}

function parseImages() {
  return JSON.parse(screen.getByTestId("images").textContent ?? "[]") as ImageItem[];
}

describe("ImageOrganizer OCR invalidation", () => {
  it("re-runs OCR on rotate and stores confidence instead of leaving a fake pending state", async () => {
    mocks.processImageForOcrDetailed.mockResolvedValue({
      text: "Rotated text",
      confidence: 62,
      language: "eng",
      mode: "accurate",
    });

    render(
      <Harness
        initialImages={[
          makeItem({
            ocrStatus: "complete",
            ocrText: "Old text",
            ocrConfidence: 95,
          }),
        ]}
      />,
    );

    fireEvent.click(screen.getByTitle("Rotate left"));

    await waitFor(() => {
      const nextImages = parseImages();
      expect(nextImages[0].rotation).toBe(270);
      expect(nextImages[0].ocrStatus).toBe("complete");
      expect(nextImages[0].ocrText).toBe("Rotated text");
      expect(nextImages[0].ocrConfidence).toBe(62);
    });
  });

  it("marks edited restored images as error when OCR cannot be rerun because the file is missing", () => {
    render(
      <Harness
        initialImages={[
          makeItem({
            file: undefined,
            ocrStatus: "complete",
            ocrText: "Restored text",
            ocrConfidence: 88,
          }),
        ]}
      />,
    );

    fireEvent.click(screen.getByTitle("Rotate right"));

    const nextImages = parseImages();
    expect(nextImages[0].rotation).toBe(90);
    expect(nextImages[0].ocrStatus).toBe("error");
    expect(nextImages[0].ocrText).toBeUndefined();
    expect(nextImages[0].ocrConfidence).toBeUndefined();
    expect(nextImages[0].ocrErrorMessage).toMatch(/must be rerun after editing/i);
  });

  it("does not mutate OCR state for images that were not edited", async () => {
    mocks.processImageForOcrDetailed.mockResolvedValue({
      text: "Updated first image",
      confidence: 73,
      language: "eng",
      mode: "accurate",
    });

    render(
      <Harness
        initialImages={[
          makeItem({
            id: "img-1",
            ocrStatus: "complete",
            ocrText: "First",
            ocrConfidence: 95,
          }),
          makeItem({
            id: "img-2",
            name: "other.png",
            ocrStatus: "complete",
            ocrText: "Second",
            ocrConfidence: 88,
          }),
        ]}
      />,
    );

    fireEvent.click(screen.getAllByTitle("Rotate left")[0]);

    await waitFor(() => {
      const nextImages = parseImages();
      expect(nextImages[0].ocrText).toBe("Updated first image");
      expect(nextImages[1].ocrStatus).toBe("complete");
      expect(nextImages[1].ocrText).toBe("Second");
      expect(nextImages[1].ocrConfidence).toBe(88);
    });
  });
});
