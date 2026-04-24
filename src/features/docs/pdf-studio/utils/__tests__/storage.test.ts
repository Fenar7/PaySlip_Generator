import { afterEach, describe, expect, it } from "vitest";
import { PDF_STUDIO_DEFAULT_SETTINGS } from "@/features/docs/pdf-studio/constants";
import {
  clearPdfStudioSession,
  loadPdfStudioSession,
  savePdfStudioSession,
  clearOcrWorkspaceSession,
  loadOcrWorkspaceSession,
  saveOcrWorkspaceSession,
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

  it("tracks OCR complete and dropped counts", () => {
    const images = [
      {
        id: "img-complete",
        previewUrl: "data:image/png;base64,a",
        rotation: 0 as const,
        name: "good.png",
        sizeBytes: 100,
        ocrStatus: "complete" as const,
        ocrText: "Hello",
        ocrConfidence: 87,
      },
      {
        id: "img-fail",
        previewUrl: "data:image/png;base64,b",
        rotation: 0 as const,
        name: "bad.png",
        sizeBytes: 50,
        ocrStatus: "error" as const,
        ocrErrorMessage: "Failed",
      },
      {
        id: "img-pending",
        previewUrl: "data:image/png;base64,c",
        rotation: 0 as const,
        name: "wait.png",
        sizeBytes: 60,
        ocrStatus: "pending" as const,
      },
    ];

    expect(savePdfStudioSession(images as any, PDF_STUDIO_DEFAULT_SETTINGS, "org-counts")).toBe(true);

    const restored = loadPdfStudioSession("org-counts");
    expect(restored).not.toBeNull();
    expect(restored!._ocrCompleteCount).toBe(1);
    expect(restored!._ocrDroppedCount).toBe(2);
  });

  it("restores mixed OCR and watermark-cleared state", () => {
    const images = [
      {
        id: "img-ocr",
        previewUrl: "data:image/png;base64,x",
        rotation: 0 as const,
        name: "scan.png",
        sizeBytes: 100,
        ocrStatus: "complete" as const,
        ocrText: "Hello world",
        ocrConfidence: 87,
      },
    ];

    const settings = {
      ...PDF_STUDIO_DEFAULT_SETTINGS,
      watermark: {
        ...PDF_STUDIO_DEFAULT_SETTINGS.watermark,
        type: "image" as const,
        image: { previewUrl: "blob:http://localhost/abc", scale: 30, opacity: 50 },
      },
    };

    expect(savePdfStudioSession(images as any, settings, "org-mixed")).toBe(true);

    const restored = loadPdfStudioSession("org-mixed");
    expect(restored).not.toBeNull();
    expect(restored!.watermarkImageCleared).toBe(true);
    expect(restored!._ocrCompleteCount).toBe(1);
    expect(restored!._ocrDroppedCount).toBe(0);
  });

  it("strips password fields from persisted session", () => {
    const settings = {
      ...PDF_STUDIO_DEFAULT_SETTINGS,
      password: {
        ...PDF_STUDIO_DEFAULT_SETTINGS.password,
        enabled: true,
        userPassword: "secret123",
        confirmPassword: "secret123",
        ownerPassword: "owner456",
      },
    };

    expect(savePdfStudioSession([] as any, settings, "org-pwd")).toBe(true);

    const restored = loadPdfStudioSession("org-pwd");
    expect(restored).not.toBeNull();
    expect(restored!.settings.password.userPassword).toBe("");
    expect(restored!.settings.password.confirmPassword).toBe("");
    expect(restored!.settings.password.ownerPassword).toBe("");
  });

  // ── OCR Workspace session ───────────────────────────────────────────

  it("saves and loads OCR workspace session scoped by org", () => {
    const images = [
      {
        id: "ocr-a",
        previewUrl: "data:image/png;base64,a",
        rotation: 0 as const,
        name: "page1.png",
        sizeBytes: 100,
        ocrStatus: "complete" as const,
        ocrText: "hello",
        ocrConfidence: 90,
      },
    ];

    expect(saveOcrWorkspaceSession(images as any, "fra", "fast", 80, "org-a")).toBe(true);

    const restored = loadOcrWorkspaceSession("org-a");
    expect(restored).not.toBeNull();
    expect(restored!.images).toHaveLength(1);
    expect(restored!.images[0]).toMatchObject({
      id: "ocr-a",
      ocrText: "hello",
      ocrConfidence: 90,
      ocrStatus: "complete",
    });
    expect(restored!.language).toBe("fra");
    expect(restored!.mode).toBe("fast");
    expect(restored!.confidenceThreshold).toBe(80);

    clearOcrWorkspaceSession("org-a");
    expect(loadOcrWorkspaceSession("org-a")).toBeNull();
  });

  it("keeps OCR workspace sessions isolated per scope", () => {
    const orgAImages = [{ id: "a", previewUrl: "data:image/png;base64,a", rotation: 0 as const, name: "a.png", sizeBytes: 12 }];
    const orgBImages = [{ id: "b", previewUrl: "data:image/png;base64,b", rotation: 0 as const, name: "b.png", sizeBytes: 24 }];

    expect(saveOcrWorkspaceSession(orgAImages as any, "eng", "accurate", 70, "org-a")).toBe(true);
    expect(saveOcrWorkspaceSession(orgBImages as any, "fra", "fast", 80, "org-b")).toBe(true);

    expect(loadOcrWorkspaceSession("org-a")?.images).toEqual(orgAImages);
    expect(loadOcrWorkspaceSession("org-b")?.images).toEqual(orgBImages);
  });
});
