import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PdfStudioWorkspace,
  PUBLIC_PDF_STUDIO_SCOPE,
} from "./pdf-studio-workspace";
import { PUBLIC_FILL_SIGN_SCOPE } from "./fill-sign/fill-sign-workspace";
import { PDF_STUDIO_DEFAULT_SETTINGS } from "@/features/docs/pdf-studio/constants";

const { usePdfStudioSurface, useActiveOrg, loadPdfStudioSession, runOcrForImage } =
  vi.hoisted(() => ({
    usePdfStudioSurface: vi.fn(),
    useActiveOrg: vi.fn(),
    loadPdfStudioSession: vi.fn(() => null),
    runOcrForImage: vi.fn(() => Promise.resolve()),
  }));

vi.mock("@/features/docs/pdf-studio/lib/surface", () => ({
  usePdfStudioSurface,
}));

vi.mock("@/hooks/use-active-org", () => ({
  useActiveOrg,
}));

vi.mock("@/features/docs/pdf-studio/utils/session-storage", () => ({
  loadPdfStudioSession,
  savePdfStudioSession: vi.fn(() => true),
  clearPdfStudioSession: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/analytics", () => ({
  usePdfStudioAnalytics: () => ({
    trackStart: vi.fn(),
    trackSuccess: vi.fn(),
    trackFail: vi.fn(),
  }),
}));

vi.mock("@/features/docs/pdf-studio/components/image-organizer", () => ({
  ImageOrganizer: () => <div data-testid="image-organizer" />,
  runOcrForImage,
}));

vi.mock("@/features/docs/pdf-studio/components/page-settings-panel", () => ({
  PageSettingsPanel: () => <div data-testid="page-settings-panel" />,
}));

vi.mock("@/features/docs/pdf-studio/components/pdf-preview", () => ({
  PdfPreview: () => <div data-testid="pdf-preview" />,
}));

vi.mock("@/components/forms/form-section", () => ({
  FormSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/docs/pdf-studio/components/ocr-progress-panel", () => ({
  OcrProgressPanel: ({
    images,
    language,
    lowConfidenceThreshold,
    onRetryAll,
  }: {
    images: Array<{ id: string; ocrStatus?: string; ocrConfidence?: number }>;
    language?: string;
    lowConfidenceThreshold?: number;
    onRetryAll?: () => void;
  }) => (
    <div data-testid="ocr-progress-panel">
      <span data-testid="ocr-progress-language">{language}</span>
      <span data-testid="ocr-progress-threshold">{String(lowConfidenceThreshold)}</span>
      <span data-testid="ocr-progress-image-count">{String(images.length)}</span>
      <button type="button" onClick={onRetryAll}>
        Retry all
      </button>
    </div>
  ),
}));

HTMLCanvasElement.prototype.getContext = vi.fn();

function makeImage(overrides: Record<string, unknown> = {}) {
  return {
    id: "img-1",
    file: new File(["image"], "page.png", { type: "image/png" }),
    previewUrl: "data:image/png;base64,abc",
    rotation: 0,
    name: "page.png",
    sizeBytes: 1024,
    ...overrides,
  };
}

describe("PdfStudioWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActiveOrg.mockReturnValue({
      activeOrg: { id: "org-123" },
      isLoading: false,
    });
  });

  it("keeps the public and fill-sign scopes isolated", () => {
    expect(PUBLIC_PDF_STUDIO_SCOPE).not.toBe(PUBLIC_FILL_SIGN_SCOPE);
  });

  it("hydrates from the active org scope in the workspace", async () => {
    usePdfStudioSurface.mockReturnValue({
      surface: "workspace",
      isPublic: false,
      isWorkspace: true,
    });

    render(<PdfStudioWorkspace />);

    expect(useActiveOrg).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(loadPdfStudioSession).toHaveBeenCalledWith("org-123"),
    );
  });

  it("keeps the OCR panel visible for low-confidence completed images", async () => {
    usePdfStudioSurface.mockReturnValue({
      surface: "workspace",
      isPublic: false,
      isWorkspace: true,
    });
    loadPdfStudioSession.mockReturnValue({
      images: [
        makeImage({
          ocrStatus: "complete",
          ocrText: "Low confidence text",
          ocrConfidence: 61,
        }),
      ],
      settings: PDF_STUDIO_DEFAULT_SETTINGS,
      savedAt: new Date().toISOString(),
    });

    render(<PdfStudioWorkspace />);

    expect(await screen.findByTestId("ocr-progress-panel")).toBeInTheDocument();
    expect(screen.getByTestId("ocr-progress-threshold")).toHaveTextContent("70");
    expect(screen.getByTestId("ocr-progress-language")).toHaveTextContent("eng");
  });

  it("retries low-confidence images in bulk from the shared workspace", async () => {
    usePdfStudioSurface.mockReturnValue({
      surface: "workspace",
      isPublic: false,
      isWorkspace: true,
    });
    const lowConfidenceFile = new File(["low"], "low.png", { type: "image/png" });
    const failedFile = new File(["failed"], "failed.png", { type: "image/png" });
    loadPdfStudioSession.mockReturnValue({
      images: [
        makeImage({
          id: "low-confidence",
          file: lowConfidenceFile,
          name: "low.png",
          ocrStatus: "complete",
          ocrText: "maybe",
          ocrConfidence: 42,
        }),
        makeImage({
          id: "failed",
          file: failedFile,
          name: "failed.png",
          ocrStatus: "error",
          ocrErrorMessage: "OCR failed",
        }),
      ],
      settings: PDF_STUDIO_DEFAULT_SETTINGS,
      savedAt: new Date().toISOString(),
    });

    render(<PdfStudioWorkspace />);

    await screen.findByTestId("ocr-progress-panel");
    fireEvent.click(screen.getByRole("button", { name: /Retry all/i }));

    await waitFor(() => expect(runOcrForImage).toHaveBeenCalledTimes(2));
    expect(runOcrForImage).toHaveBeenCalledWith(
      "low-confidence",
      lowConfidenceFile,
      expect.any(Function),
      expect.any(Function),
      "eng",
    );
    expect(runOcrForImage).toHaveBeenCalledWith(
      "failed",
      failedFile,
      expect.any(Function),
      expect.any(Function),
      "eng",
    );
  });

  it("shows specific restore banner with OCR counts when some OCR was dropped", async () => {
    usePdfStudioSurface.mockReturnValue({
      surface: "workspace",
      isPublic: false,
      isWorkspace: true,
    });
    loadPdfStudioSession.mockReturnValue({
      images: [
        makeImage({
          id: "img-1",
          ocrStatus: "complete",
          ocrText: "hello",
          ocrConfidence: 85,
        }),
        makeImage({ id: "img-2" }),
      ],
      settings: PDF_STUDIO_DEFAULT_SETTINGS,
      savedAt: new Date().toISOString(),
      _ocrCompleteCount: 1,
      _ocrDroppedCount: 1,
    });

    render(<PdfStudioWorkspace />);

    await waitFor(() => {
      expect(screen.getByText(/1 page has restored OCR text\. 1 page needs OCR rerun/i)).toBeInTheDocument();
    });
  });

  it("shows fully-restored OCR message when all pages have OCR text", async () => {
    usePdfStudioSurface.mockReturnValue({
      surface: "workspace",
      isPublic: false,
      isWorkspace: true,
    });
    loadPdfStudioSession.mockReturnValue({
      images: [
        makeImage({
          id: "img-1",
          ocrStatus: "complete",
          ocrText: "hello",
          ocrConfidence: 85,
        }),
      ],
      settings: PDF_STUDIO_DEFAULT_SETTINGS,
      savedAt: new Date().toISOString(),
      _ocrCompleteCount: 1,
      _ocrDroppedCount: 0,
    });

    render(<PdfStudioWorkspace />);

    await waitFor(() => {
      expect(screen.getByText(/OCR text restored for all 1 page/i)).toBeInTheDocument();
    });
  });

  it("combines watermark cleared message with OCR restore message", async () => {
    usePdfStudioSurface.mockReturnValue({
      surface: "workspace",
      isPublic: false,
      isWorkspace: true,
    });
    loadPdfStudioSession.mockReturnValue({
      images: [
        makeImage({
          id: "img-1",
          ocrStatus: "complete",
          ocrText: "hello",
          ocrConfidence: 85,
        }),
        makeImage({ id: "img-2" }),
      ],
      settings: PDF_STUDIO_DEFAULT_SETTINGS,
      savedAt: new Date().toISOString(),
      watermarkImageCleared: true,
      _ocrCompleteCount: 1,
      _ocrDroppedCount: 1,
    });

    render(<PdfStudioWorkspace />);

    await waitFor(() => {
      expect(screen.getByText(/Watermark image was cleared on refresh/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 page has restored OCR text\. 1 page needs OCR rerun/i)).toBeInTheDocument();
  });
});
