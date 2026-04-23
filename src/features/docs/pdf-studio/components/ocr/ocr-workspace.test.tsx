import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OcrWorkspace } from "./ocr-workspace";

const { usePdfStudioSurface, useActiveOrg, usePlan } = vi.hoisted(() => ({
  usePdfStudioSurface: vi.fn(),
  useActiveOrg: vi.fn(),
  usePlan: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/surface", () => ({
  usePdfStudioSurface,
}));

vi.mock("@/hooks/use-active-org", () => ({
  useActiveOrg,
}));

vi.mock("@/hooks/use-plan", () => ({
  usePlan,
}));

vi.mock("@/features/docs/pdf-studio/lib/analytics", () => ({
  usePdfStudioAnalytics: () => ({
    surface: "public",
    trackFail: vi.fn(),
    trackStart: vi.fn(),
    trackSuccess: vi.fn(),
    trackUpload: vi.fn(),
  }),
}));

vi.mock("@/features/docs/pdf-studio/components/shared/pdf-upload-zone", () => ({
  PdfUploadZone: ({
    label,
    sublabel,
  }: {
    label?: string;
    sublabel?: string;
  }) => (
    <div data-testid="upload-zone">
      <span>{label}</span>
      <span>{sublabel}</span>
    </div>
  ),
}));

vi.mock("@/features/docs/pdf-studio/components/ocr-enhancement-panel", () => ({
  OcrEnhancementPanel: () => <div data-testid="ocr-enhancement-panel" />,
}));

vi.mock("@/features/docs/pdf-studio/components/ocr-progress-panel", () => ({
  OcrProgressPanel: () => <div data-testid="ocr-progress-panel" />,
}));

describe("OcrWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActiveOrg.mockReturnValue({ activeOrg: { id: "org-123" } });
    usePlan.mockReturnValue({
      plan: { planId: "pro", planName: "Pro" },
    });
  });

  it("keeps the public OCR lane off workspace hooks", () => {
    usePdfStudioSurface.mockReturnValue({
      surface: "public",
      isPublic: true,
      isWorkspace: false,
    });

    render(<OcrWorkspace />);

    expect(useActiveOrg).not.toHaveBeenCalled();
    expect(usePlan).not.toHaveBeenCalled();
    expect(screen.getByTestId("upload-zone")).toHaveTextContent(
      /up to 10 pages on this lane/i,
    );
  });

  it("uses org plan limits in the workspace", () => {
    usePdfStudioSurface.mockReturnValue({
      surface: "workspace",
      isPublic: false,
      isWorkspace: true,
    });

    render(<OcrWorkspace />);

    expect(useActiveOrg).toHaveBeenCalledTimes(1);
    expect(usePlan).toHaveBeenCalledWith("org-123");
    expect(screen.getByTestId("upload-zone")).toHaveTextContent(
      /up to 30 pages on this lane/i,
    );
  });
});
