import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FillSignWorkspace,
  PUBLIC_FILL_SIGN_SCOPE,
} from "./fill-sign-workspace";

const { usePdfStudioSurface, useActiveOrg, getSavedSignatures } = vi.hoisted(
  () => ({
    usePdfStudioSurface: vi.fn(),
    useActiveOrg: vi.fn(),
    getSavedSignatures: vi.fn(() => []),
  }),
);

vi.mock("@/features/docs/pdf-studio/lib/surface", () => ({
  usePdfStudioSurface,
}));

vi.mock("@/hooks/use-active-org", () => ({
  useActiveOrg,
}));

vi.mock("@/features/docs/pdf-studio/lib/analytics", () => ({
  usePdfStudioAnalytics: () => ({
    trackFail: vi.fn(),
    trackSuccess: vi.fn(),
    trackUpload: vi.fn(),
  }),
}));

vi.mock("./signature-canvas", () => ({
  SignatureCanvas: () => <div data-testid="signature-canvas" />,
}));

vi.mock("@/features/docs/pdf-studio/utils/signature", () => ({
  getSavedSignatures,
  saveSignature: vi.fn(),
  clearSavedSignatures: vi.fn(),
}));

describe("FillSignWorkspace", () => {
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

    render(<FillSignWorkspace />);

    expect(useActiveOrg).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(getSavedSignatures).toHaveBeenCalledWith(PUBLIC_FILL_SIGN_SCOPE),
    );
  });

  it("uses the active org scope in the workspace", async () => {
    usePdfStudioSurface.mockReturnValue({
      surface: "workspace",
      isPublic: false,
      isWorkspace: true,
    });

    render(<FillSignWorkspace />);

    expect(useActiveOrg).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(getSavedSignatures).toHaveBeenCalledWith("org-123"),
    );
  });
});
