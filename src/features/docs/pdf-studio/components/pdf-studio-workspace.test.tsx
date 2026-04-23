import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PdfStudioWorkspace,
  PUBLIC_PDF_STUDIO_SCOPE,
} from "./pdf-studio-workspace";

const { usePdfStudioSurface, useActiveOrg, loadPdfStudioSession } = vi.hoisted(
  () => ({
    usePdfStudioSurface: vi.fn(),
    useActiveOrg: vi.fn(),
    loadPdfStudioSession: vi.fn(() => null),
  }),
);

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

// Mock the canvas element completely since we are using JSdom
HTMLCanvasElement.prototype.getContext = vi.fn();

describe("PdfStudioWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActiveOrg.mockReturnValue({
      activeOrg: { id: "org-123" },
      isLoading: false,
    });
  });

  it("uses an anonymous browser scope on the public surface", async () => {
    usePdfStudioSurface.mockReturnValue({
      surface: "public",
      isPublic: true,
      isWorkspace: false,
    });

    render(<PdfStudioWorkspace />);

    expect(useActiveOrg).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(loadPdfStudioSession).toHaveBeenCalledWith(PUBLIC_PDF_STUDIO_SCOPE),
    );
  });

  it("uses the active org scope in the workspace", async () => {
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
});
