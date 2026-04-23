import { describe, expect, it } from "vitest";
import { buildPdfStudioAnalyticsSnapshot } from "@/features/docs/pdf-studio/lib/dashboard";
import type { PdfStudioConversionHistoryEntry } from "@/features/docs/pdf-studio/lib/conversion-jobs";

describe("pdf studio analytics snapshot", () => {
  it("summarizes tracked worker-backed jobs for the dashboard panel", () => {
    const snapshot = buildPdfStudioAnalyticsSnapshot([
      {
        jobId: "job-1",
        toolId: "pdf-to-word",
        status: "completed",
        createdAt: "2026-04-22T00:00:00.000Z",
        attempts: 0,
        totalItems: 2,
        completedItems: 2,
        failedItems: 0,
        sourceLabel: "2 files",
        canRetry: false,
        bundleAvailable: true,
      },
      {
        jobId: "job-2",
        toolId: "pdf-to-word",
        status: "dead_letter",
        createdAt: "2026-04-22T00:00:00.000Z",
        attempts: 1,
        totalItems: 1,
        completedItems: 0,
        failedItems: 1,
        sourceLabel: "invoice.pdf",
        canRetry: true,
        bundleAvailable: false,
      },
      {
        jobId: "job-3",
        toolId: "word-to-pdf",
        status: "processing",
        createdAt: "2026-04-22T00:00:00.000Z",
        attempts: 0,
        totalItems: 1,
        completedItems: 0,
        failedItems: 0,
        sourceLabel: "draft.docx",
        canRetry: false,
        bundleAvailable: false,
      },
      {
        jobId: "job-4",
        toolId: "html-to-pdf",
        status: "completed",
        createdAt: "2026-04-22T00:00:00.000Z",
        attempts: 0,
        totalItems: 3,
        completedItems: 3,
        failedItems: 0,
        sourceLabel: "3 files",
        canRetry: false,
        bundleAvailable: true,
      },
    ] satisfies PdfStudioConversionHistoryEntry[]);

    expect(snapshot).toMatchObject({
      totalJobs: 4,
      completedJobs: 2,
      failedJobs: 1,
      activeJobs: 1,
      batchJobs: 2,
      outputItems: 5,
      uniqueTools: 3,
      successRate: 67,
    });
    expect(snapshot.topTools[0]).toMatchObject({
      toolId: "pdf-to-word",
      title: "PDF to Word",
      count: 2,
    });
  });
});
