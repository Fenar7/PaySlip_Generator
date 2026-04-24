import { afterEach, describe, expect, it } from "vitest";
import { PDF_STUDIO_DEFAULT_SETTINGS } from "@/features/docs/pdf-studio/constants";
import {
  clearPdfStudioSession,
  loadPdfStudioSession,
  savePdfStudioSession,
} from "@/features/docs/pdf-studio/utils/session-storage";
import {
  clearSavedSignatures,
  getSavedSignatures,
  saveSignature,
} from "@/features/docs/pdf-studio/utils/signature";

describe("pdf studio storage scoping", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("keeps saved signatures isolated per organization scope", () => {
    saveSignature("data:image/png;base64,one", "org-a");
    saveSignature("data:image/png;base64,two", "org-b");

    expect(getSavedSignatures("org-a")).toEqual(["data:image/png;base64,one"]);
    expect(getSavedSignatures("org-b")).toEqual(["data:image/png;base64,two"]);

    clearSavedSignatures("org-a");
    expect(getSavedSignatures("org-a")).toEqual([]);
    expect(getSavedSignatures("org-b")).toEqual(["data:image/png;base64,two"]);
  });

  it("stores pdf studio sessions under the active organization scope", () => {
    const orgAImages = [
      {
        id: "img-a",
        previewUrl: "data:image/png;base64,a",
        rotation: 0 as const,
        name: "a.png",
        sizeBytes: 12,
      },
    ];
    const orgBImages = [
      {
        id: "img-b",
        previewUrl: "data:image/png;base64,b",
        rotation: 90 as const,
        name: "b.png",
        sizeBytes: 24,
      },
    ];

    expect(savePdfStudioSession(orgAImages as any, PDF_STUDIO_DEFAULT_SETTINGS, "org-a")).toBe(true);
    expect(savePdfStudioSession(orgBImages as any, PDF_STUDIO_DEFAULT_SETTINGS, "org-b")).toBe(true);

    expect(loadPdfStudioSession("org-a")?.images).toEqual(orgAImages);
    expect(loadPdfStudioSession("org-b")?.images).toEqual(orgBImages);

    clearPdfStudioSession("org-a");
    expect(loadPdfStudioSession("org-a")).toBeNull();
    expect(loadPdfStudioSession("org-b")?.images).toEqual(orgBImages);
  });

  it("persists and restores completed OCR text and confidence", () => {
    const images = [
      {
        id: "img-ocr",
        previewUrl: "data:image/png;base64,x",
        rotation: 0 as const,
        name: "scan.png",
        sizeBytes: 100,
        ocrText: "Hello world",
        ocrConfidence: 87,
        ocrStatus: "complete" as const,
      },
    ];

    expect(savePdfStudioSession(images as any, PDF_STUDIO_DEFAULT_SETTINGS, "org-ocr")).toBe(true);

    const restored = loadPdfStudioSession("org-ocr");
    expect(restored).not.toBeNull();
    expect(restored!.images).toHaveLength(1);
    expect(restored!.images[0]).toMatchObject({
      id: "img-ocr",
      ocrText: "Hello world",
      ocrConfidence: 87,
      ocrStatus: "complete",
    });
  });

  it("does not persist failed or pending OCR state", () => {
    const images = [
      {
        id: "img-fail",
        previewUrl: "data:image/png;base64,y",
        rotation: 0 as const,
        name: "bad.png",
        sizeBytes: 50,
        ocrStatus: "error" as const,
        ocrErrorMessage: "OCR failed",
      },
      {
        id: "img-pending",
        previewUrl: "data:image/png;base64,z",
        rotation: 0 as const,
        name: "wait.png",
        sizeBytes: 60,
        ocrStatus: "pending" as const,
      },
    ];

    expect(savePdfStudioSession(images as any, PDF_STUDIO_DEFAULT_SETTINGS, "org-pending")).toBe(true);

    const restored = loadPdfStudioSession("org-pending");
    expect(restored).not.toBeNull();
    expect(restored!.images).toHaveLength(2);
    expect(restored!.images[0].ocrStatus).toBeUndefined();
    expect(restored!.images[0].ocrErrorMessage).toBeUndefined();
    expect(restored!.images[1].ocrStatus).toBeUndefined();
  });
});
