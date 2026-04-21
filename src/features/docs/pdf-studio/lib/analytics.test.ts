import { describe, expect, it, vi } from "vitest";
import { trackPdfStudioLifecycleEvent } from "@/features/docs/pdf-studio/lib/analytics";
import { trackEvent } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

describe("pdf studio analytics", () => {
  it("strips raw filenames and error text before forwarding analytics events", () => {
    trackPdfStudioLifecycleEvent("pdf_studio_fail", {
      subject: "merge",
      surface: "public",
      stage: "upload",
      reason: "unsupported-file-type",
      message: "secret-client-list.pdf is not supported.",
      filename: "secret-client-list.pdf",
    });

    expect(trackEvent).toHaveBeenCalledWith("pdf_studio_fail", {
      subject: "merge",
      surface: "public",
      stage: "upload",
      reason: "unsupported-file-type",
    });
  });
});
