import { describe, expect, it } from "vitest";
import {
  buildPdfStudioReadinessChecklist,
  buildPdfStudioSupportCoverageLanes,
  buildPdfStudioSupportDiagnostics,
  derivePdfStudioRecoveryState,
  getPdfStudioFailureHelpHref,
  getPdfStudioFailureRecoveryHint,
} from "@/features/docs/pdf-studio/lib/support";
import type { PdfStudioConversionHistoryEntry } from "@/features/docs/pdf-studio/lib/conversion-jobs";

describe("pdf studio support helpers", () => {
  it("builds support diagnostics from recent job history", () => {
    const diagnostics = buildPdfStudioSupportDiagnostics({
      historyWindow: 25,
      queueDepth: 2,
      entries: [
        {
          jobId: "job-1",
          toolId: "pdf-to-word",
          status: "dead_letter",
          createdAt: "2026-04-22T00:00:00.000Z",
          attempts: 2,
          totalItems: 1,
          completedItems: 0,
          failedItems: 1,
          sourceLabel: "broken.pdf",
          error: "The PDF is malformed.",
          failureCode: "malformed_pdf",
          canRetry: false,
          sourceAvailable: true,
          bundleAvailable: false,
        },
        {
          jobId: "job-2",
          toolId: "word-to-pdf",
          status: "retry_pending",
          createdAt: "2026-04-22T00:00:00.000Z",
          attempts: 1,
          totalItems: 2,
          completedItems: 1,
          failedItems: 0,
          sourceLabel: "2 files",
          error: "Storage temporarily failed.",
          failureCode: "storage_error",
          canRetry: false,
          sourceAvailable: true,
          bundleAvailable: false,
        },
        {
          jobId: "job-3",
          toolId: "html-to-pdf",
          status: "completed",
          createdAt: "2026-04-22T00:00:00.000Z",
          attempts: 0,
          totalItems: 1,
          completedItems: 1,
          failedItems: 0,
          sourceLabel: "print.html",
          canRetry: false,
          sourceAvailable: true,
          bundleAvailable: false,
        },
      ] satisfies PdfStudioConversionHistoryEntry[],
    });

    expect(diagnostics).toMatchObject({
      historyWindow: 25,
      queueDepth: 2,
      failedJobs: 1,
      retryingJobs: 1,
      processingJobs: 0,
      successRate: 50,
    });
    expect(diagnostics.topFailureCodes[0]).toMatchObject({
      code: "malformed_pdf",
      helpHref: "/help/troubleshooting/pdf-studio-jobs#malformed_pdf",
    });
    expect(diagnostics.recentIssues[0]).toMatchObject({
      jobId: "job-1",
      toolTitle: "PDF to Word",
      recoveryState: { kind: "terminal_error", label: "Failed — terminal error" },
    });
    expect(diagnostics.recentIssues[1]).toMatchObject({
      jobId: "job-2",
      toolTitle: "Word to PDF",
      recoveryState: { kind: "automatic_retry", label: "Automatic retry queued" },
    });
  });

  it("maps recovery links and hints for failure codes", () => {
    expect(getPdfStudioFailureHelpHref("storage_error")).toBe(
      "/help/troubleshooting/pdf-studio-jobs#storage_error",
    );
    expect(getPdfStudioFailureRecoveryHint("storage_error")).toContain("Retry once");
  });

  it("derives recovery states aligned with workspace history", () => {
    expect(
      derivePdfStudioRecoveryState({
        status: "retry_pending",
        canRetry: false,
        sourceAvailable: true,
      }),
    ).toMatchObject({
      kind: "automatic_retry",
      label: "Automatic retry queued",
      tone: "warning",
    });

    expect(
      derivePdfStudioRecoveryState({
        status: "dead_letter",
        canRetry: true,
        sourceAvailable: true,
      }),
    ).toMatchObject({
      kind: "manual_retry",
      label: "Failed — manual retry available",
      tone: "error",
    });

    expect(
      derivePdfStudioRecoveryState({
        status: "dead_letter",
        canRetry: false,
        sourceAvailable: false,
      }),
    ).toMatchObject({
      kind: "source_repair",
      label: "Failed — source repair required",
      tone: "error",
    });

    expect(
      derivePdfStudioRecoveryState({
        status: "dead_letter",
        canRetry: false,
        sourceAvailable: true,
      }),
    ).toMatchObject({
      kind: "terminal_error",
      label: "Failed — terminal error",
      tone: "error",
    });

    expect(
      derivePdfStudioRecoveryState({
        status: "completed",
        canRetry: false,
        sourceAvailable: true,
      }),
    ).toBeNull();
  });

  it("maps source_unavailable to source-repair guidance", () => {
    expect(getPdfStudioFailureRecoveryHint("source_unavailable")).toContain(
      "Re-upload the file",
    );
  });

  it("builds readiness checks from feature, plan, and queue state", () => {
    const checklist = buildPdfStudioReadinessChecklist({
      featureEnabled: true,
      planId: "starter",
      diagnostics: buildPdfStudioSupportDiagnostics({
        historyWindow: 10,
        queueDepth: 3,
        entries: [],
      }),
    });

    expect(checklist.find((item) => item.id === "pdf-studio-access")).toMatchObject({
      status: "pass",
    });
    expect(checklist.find((item) => item.id === "plan-window")).toMatchObject({
      status: "warn",
    });
    expect(checklist.find((item) => item.id === "queue-headroom")).toMatchObject({
      status: "fail",
    });
    expect(
      checklist.find((item) => item.id === "browser-recovery-paths"),
    ).toMatchObject({
      status: "pass",
      actionHref: "/help/troubleshooting/pdf-studio-support",
    });
  });

  it("builds honest support coverage lanes for browser and worker tools", () => {
    const lanes = buildPdfStudioSupportCoverageLanes();

    expect(lanes).toHaveLength(2);
    expect(lanes[0]).toMatchObject({
      id: "browser-first",
      helpHref: "/help/troubleshooting/pdf-studio-support",
    });
    expect(lanes[0].toolCount).toBeGreaterThan(0);
    expect(lanes[1]).toMatchObject({
      id: "worker-backed",
      helpHref: "/help/troubleshooting/pdf-studio-jobs",
    });
    expect(lanes[1].toolCount).toBeGreaterThan(0);
  });
});
