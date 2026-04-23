import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    jobLog: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/storage/upload-server", () => ({
  deleteFileServer: vi.fn(),
  downloadFileServer: vi.fn(),
  getSignedUrlServer: vi.fn(),
  uploadFileServer: vi.fn(),
}));

import { db } from "@/lib/db";
import { deleteFileServer, getSignedUrlServer } from "@/lib/storage/upload-server";
import {
  cleanupExpiredPdfStudioConversionArtifacts,
  getPdfStudioConversionJob,
} from "@/features/docs/pdf-studio/lib/conversion-jobs";

describe("conversion job lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stops issuing download URLs once a completed artifact expires", async () => {
    vi.mocked(db.jobLog.findFirst).mockResolvedValue({
      id: "job-1",
      status: "completed",
      retryCount: 0,
      errorMessage: null,
      payload: {
        outputStorageKey: "org-1/pdf-studio/conversions/job-1/output.docx",
        outputFileName: "converted.docx",
        resultExpiresAt: new Date(Date.now() - 60_000).toISOString(),
      },
    } as never);

    const job = await getPdfStudioConversionJob("job-1", "org-1");

    expect(job).toMatchObject({
      jobId: "job-1",
      status: "completed",
      outputFileName: "converted.docx",
      downloadUrl: undefined,
    });
    expect(job?.error).toContain("expired after 24 hours");
    expect(getSignedUrlServer).not.toHaveBeenCalled();
  });

  it("cleans up expired artifacts and deletes aged records", async () => {
    vi.mocked(db.jobLog.findMany).mockResolvedValue([
      {
        id: "job-1",
        status: "completed",
        completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        triggeredAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        payload: {
          sourceStorageKey: "org-1/pdf-studio/conversions/job-1/source.pdf",
          outputStorageKey: "org-1/pdf-studio/conversions/job-1/result.docx",
        },
      },
    ] as never);

    const result = await cleanupExpiredPdfStudioConversionArtifacts(10);

    expect(result).toEqual({ cleaned: 1, deletedRecords: 1 });
    expect(deleteFileServer).toHaveBeenCalledWith(
      "attachments",
      "org-1/pdf-studio/conversions/job-1/source.pdf",
      { useAdmin: true },
    );
    expect(deleteFileServer).toHaveBeenCalledWith(
      "attachments",
      "org-1/pdf-studio/conversions/job-1/result.docx",
      { useAdmin: true },
    );
    expect(db.jobLog.delete).toHaveBeenCalledWith({ where: { id: "job-1" } });
  });

  it("exposes batch output details and bundle download paths for completed jobs", async () => {
    vi.mocked(db.jobLog.findFirst).mockResolvedValue({
      id: "job-batch",
      status: "completed",
      retryCount: 1,
      errorMessage: null,
      nextRetryAt: null,
      payload: {
        toolId: "pdf-to-word",
        targetFormat: "docx",
        totalItems: 2,
        resultExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        outputs: [
          {
            index: 0,
            sourceFileName: "alpha.pdf",
            storageKey: "org-1/pdf-studio/conversions/job-batch/outputs/01-alpha.docx",
            fileName: "alpha-batch-01.docx",
            mimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          },
          {
            index: 1,
            sourceFileName: "beta.pdf",
            storageKey: "org-1/pdf-studio/conversions/job-batch/outputs/02-beta.docx",
            fileName: "beta-batch-02.docx",
            mimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          },
        ],
      },
    } as never);
    vi.mocked(getSignedUrlServer)
      .mockResolvedValueOnce("https://example.com/alpha")
      .mockResolvedValueOnce("https://example.com/beta");

    const job = await getPdfStudioConversionJob("job-batch", "org-1");

    expect(job).toMatchObject({
      jobId: "job-batch",
      status: "completed",
      totalItems: 2,
      completedItems: 2,
      bundleDownloadPath: "/api/pdf-studio/conversions/job-batch/bundle",
      outputs: [
        {
          outputFileName: "alpha-batch-01.docx",
          downloadUrl: "https://example.com/alpha",
        },
        {
          outputFileName: "beta-batch-02.docx",
          downloadUrl: "https://example.com/beta",
        },
      ],
    });
  });

  it("includes failure codes for dead-letter jobs so support can diagnose them", async () => {
    vi.mocked(db.jobLog.findFirst).mockResolvedValue({
      id: "job-failed",
      status: "dead_letter",
      retryCount: 2,
      errorMessage: "The PDF is malformed.",
      nextRetryAt: null,
      payload: {
        toolId: "pdf-to-word",
        targetFormat: "docx",
        sourceFileName: "broken.pdf",
        failureCode: "malformed_pdf",
        failureRetryable: false,
      },
    } as never);

    const job = await getPdfStudioConversionJob("job-failed", "org-1");

    expect(job).toMatchObject({
      jobId: "job-failed",
      status: "dead_letter",
      error: "The PDF is malformed.",
      failureCode: "malformed_pdf",
      canRetry: false,
    });
  });
});
