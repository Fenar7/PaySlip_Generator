import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  capturePdfStudioSupportFailure,
  trackPdfStudioLifecycleEvent,
} from "@/features/docs/pdf-studio/lib/analytics";
import { trackEvent } from "@/lib/analytics";
import { captureError } from "@/lib/sentry";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/sentry", () => ({
  captureError: vi.fn(),
}));

describe("pdf studio analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("captures support telemetry for browser runtime failures without raw file context", async () => {
    await capturePdfStudioSupportFailure({
      subject: "merge",
      executionMode: "browser",
      route: "/app/docs/pdf-studio/merge",
      surface: "workspace",
      failure: {
        stage: "process",
        reason: "processing-failed",
        message: "secret-client-list.pdf failed",
        filename: "secret-client-list.pdf",
      },
    });

    expect(captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        subject: "merge",
        supportLane: "browser-first",
        diagnosticsScope: "telemetry-only",
        stage: "process",
        reason: "processing-failed",
        helpHref: "/help/troubleshooting/pdf-studio-support",
      }),
    );
    expect(captureError).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        filename: "secret-client-list.pdf",
      }),
    );
  });

  it("does not capture support telemetry for validation-only failures", async () => {
    await capturePdfStudioSupportFailure({
      subject: "merge",
      executionMode: "browser",
      route: "/app/docs/pdf-studio/merge",
      surface: "workspace",
      failure: {
        stage: "upload",
        reason: "unsupported-file-type",
      },
    });

    expect(captureError).not.toHaveBeenCalled();
  });
});
