import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerConversionWorkspace } from "./server-conversion-workspace";

const { useActiveOrg, usePlan, usePdfStudioAnalytics } = vi.hoisted(() => ({
  useActiveOrg: vi.fn(),
  usePlan: vi.fn(),
  usePdfStudioAnalytics: vi.fn(),
}));

vi.mock("@/hooks/use-active-org", () => ({
  useActiveOrg,
}));

vi.mock("@/hooks/use-plan", () => ({
  usePlan,
}));

vi.mock("@/features/docs/pdf-studio/lib/analytics", () => ({
  usePdfStudioAnalytics,
}));

vi.mock("@/features/docs/pdf-studio/components/pdf-studio-upgrade-notice", () => ({
  PdfStudioUpgradeNotice: () => <div data-testid="upgrade-notice" />,
}));

describe("ServerConversionWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActiveOrg.mockReturnValue({ activeOrg: { id: "org-1" } });
    usePlan.mockReturnValue({ plan: { planId: "pro" }, loading: false });
    usePdfStudioAnalytics.mockReturnValue({
      trackStart: vi.fn(),
      trackSuccess: vi.fn(),
      trackFail: vi.fn(),
      trackUpload: vi.fn(),
    });
    global.fetch = vi.fn();
  });

  it("renders history with retry-pending status and scheduled time", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              jobId: "job-1",
              status: "retry_pending",
              createdAt: "2026-04-22T00:00:00.000Z",
              attempts: 2,
              totalItems: 1,
              completedItems: 0,
              failedItems: 0,
              sourceLabel: "report.pdf",
              error: "Temporary failure.",
              failureCode: "storage_error",
              canRetry: false,
              sourceAvailable: true,
              bundleAvailable: false,
              nextRetryAt: "2026-04-22T01:00:00.000Z",
            },
          ],
          meta: { historyLimit: 10 },
        }),
        { status: 200 },
      ),
    );

    render(
      <ServerConversionWorkspace
        toolId="pdf-to-word"
        title="PDF to Word"
        description="Convert PDF to Word"
        targetFormat="docx"
        notice="Notice"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Automatic retry queued/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Retry queued/)).toBeInTheDocument();
  });

  it("renders dead-letter history with manual retry available", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              jobId: "job-1",
              status: "dead_letter",
              createdAt: "2026-04-22T00:00:00.000Z",
              attempts: 3,
              totalItems: 1,
              completedItems: 0,
              failedItems: 1,
              sourceLabel: "report.pdf",
              error: "Temporary failure.",
              failureCode: "storage_error",
              canRetry: true,
              sourceAvailable: true,
              bundleAvailable: false,
              nextRetryAt: null,
            },
          ],
          meta: { historyLimit: 10 },
        }),
        { status: 200 },
      ),
    );

    render(
      <ServerConversionWorkspace
        toolId="pdf-to-word"
        title="PDF to Word"
        description="Convert PDF to Word"
        targetFormat="docx"
        notice="Notice"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed — manual retry available/)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Retry PDF Studio job job-1/i })).toBeInTheDocument();
  });

  it("renders dead-letter history with source repair required", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              jobId: "job-1",
              status: "dead_letter",
              createdAt: "2026-04-22T00:00:00.000Z",
              attempts: 2,
              totalItems: 1,
              completedItems: 0,
              failedItems: 1,
              sourceLabel: "report.pdf",
              error: "Source missing.",
              failureCode: "source_unavailable",
              canRetry: false,
              sourceAvailable: false,
              bundleAvailable: false,
              nextRetryAt: null,
            },
          ],
          meta: { historyLimit: 10 },
        }),
        { status: 200 },
      ),
    );

    render(
      <ServerConversionWorkspace
        toolId="pdf-to-word"
        title="PDF to Word"
        description="Convert PDF to Word"
        targetFormat="docx"
        notice="Notice"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed — source repair required/)).toBeInTheDocument();
    });
    expect(screen.getByText(/original source file was removed or expired/i)).toBeInTheDocument();
  });

  it("renders dead-letter history with terminal error when source is present but not retryable", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              jobId: "job-1",
              status: "dead_letter",
              createdAt: "2026-04-22T00:00:00.000Z",
              attempts: 2,
              totalItems: 1,
              completedItems: 0,
              failedItems: 1,
              sourceLabel: "report.pdf",
              error: "Malformed PDF.",
              failureCode: "malformed_pdf",
              canRetry: false,
              sourceAvailable: true,
              bundleAvailable: false,
              nextRetryAt: null,
            },
          ],
          meta: { historyLimit: 10 },
        }),
        { status: 200 },
      ),
    );

    render(
      <ServerConversionWorkspace
        toolId="pdf-to-word"
        title="PDF to Word"
        description="Convert PDF to Word"
        targetFormat="docx"
        notice="Notice"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed — terminal error/)).toBeInTheDocument();
    });
  });
});
