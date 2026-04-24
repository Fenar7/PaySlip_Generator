import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ImageOrganizer } from "./image-organizer";
import type { ImageItem } from "@/features/docs/pdf-studio/types";

vi.mock("@/features/docs/pdf-studio/utils/ocr-processor", () => ({
  processImageForOcr: vi.fn(() => Promise.resolve("mock ocr text")),
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
    previewUrl: "data:image/png;base64,abc",
    rotation: 0,
    name: "test.png",
    sizeBytes: 100,
    ...partial,
  };
}

describe("ImageOrganizer OCR invalidation", () => {
  it("clears OCR state when an image is rotated left", () => {
    const onChange = vi.fn();
    const images: ImageItem[] = [
      makeItem({
        id: "img-1",
        ocrStatus: "complete",
        ocrText: "Hello",
        ocrConfidence: 95,
      }),
    ];

    render(
      <ImageOrganizer
        images={images}
        onChange={onChange}
        selectedIds={[]}
        onSelectionChange={vi.fn()}
        onBatchDelete={vi.fn()}
        onBatchRotateLeft={vi.fn()}
        onBatchRotateRight={vi.fn()}
        onSelectAll={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );

    const rotateLeftButton = screen.getByTitle("Rotate left");
    fireEvent.click(rotateLeftButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    const nextImages = onChange.mock.calls[0][0] as ImageItem[];
    expect(nextImages[0].rotation).toBe(270);
    expect(nextImages[0].ocrStatus).toBe("pending");
    expect(nextImages[0].ocrText).toBeUndefined();
    expect(nextImages[0].ocrConfidence).toBeUndefined();
    expect(nextImages[0].ocrErrorMessage).toBeUndefined();
  });

  it("clears OCR state when an image is rotated right", () => {
    const onChange = vi.fn();
    const images: ImageItem[] = [
      makeItem({
        id: "img-1",
        ocrStatus: "complete",
        ocrText: "Hello",
        ocrConfidence: 95,
      }),
    ];

    render(
      <ImageOrganizer
        images={images}
        onChange={onChange}
        selectedIds={[]}
        onSelectionChange={vi.fn()}
        onBatchDelete={vi.fn()}
        onBatchRotateLeft={vi.fn()}
        onBatchRotateRight={vi.fn()}
        onSelectAll={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );

    const rotateRightButton = screen.getByTitle("Rotate right");
    fireEvent.click(rotateRightButton);

    const nextImages = onChange.mock.calls[0][0] as ImageItem[];
    expect(nextImages[0].rotation).toBe(90);
    expect(nextImages[0].ocrStatus).toBe("pending");
    expect(nextImages[0].ocrText).toBeUndefined();
  });

  it("does not mutate OCR state for unrotated images", () => {
    const onChange = vi.fn();
    const images: ImageItem[] = [
      makeItem({
        id: "img-1",
        ocrStatus: "complete",
        ocrText: "Hello",
        ocrConfidence: 95,
      }),
      makeItem({
        id: "img-2",
        ocrStatus: "complete",
        ocrText: "World",
        ocrConfidence: 88,
      }),
    ];

    render(
      <ImageOrganizer
        images={images}
        onChange={onChange}
        selectedIds={[]}
        onSelectionChange={vi.fn()}
        onBatchDelete={vi.fn()}
        onBatchRotateLeft={vi.fn()}
        onBatchRotateRight={vi.fn()}
        onSelectAll={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );

    const rotateLeftButton = screen.getAllByTitle("Rotate left")[0];
    fireEvent.click(rotateLeftButton);

    const nextImages = onChange.mock.calls[0][0] as ImageItem[];
    expect(nextImages[0].ocrStatus).toBe("pending");
    expect(nextImages[1].ocrStatus).toBe("complete");
    expect(nextImages[1].ocrText).toBe("World");
  });
});
