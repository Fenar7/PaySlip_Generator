import { beforeEach, describe, expect, it, vi } from "vitest";
import { PdfStudioConversionError } from "@/features/docs/pdf-studio/lib/conversion-errors";

vi.mock("@/lib/db", () => ({
  db: {
    jobLog: {
      findUniqueOrThrow: vi.fn(),
    },
  },
}));

vi.mock("@/features/docs/pdf-studio/lib/conversion-jobs", () => ({
  claimPdfStudioConversionJob: vi.fn(),
  claimPdfStudioConversionJobForOrg: vi.fn(),
  listRetryablePdfStudioConversionJobs: vi.fn(),
  markPdfStudioConversionComplete: vi.fn(),
  markPdfStudioConversionFailed: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/server-converters", () => ({
  runServerConversion: vi.fn(),
}));

import { db } from "@/lib/db";
import {
  claimPdfStudioConversionJob,
  claimPdfStudioConversionJobForOrg,
  listRetryablePdfStudioConversionJobs,
  markPdfStudioConversionComplete,
  markPdfStudioConversionFailed,
} from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { runServerConversion } from "@/features/docs/pdf-studio/lib/server-converters";
import {
  processPdfStudioConversionJob,
  processPendingPdfStudioConversionJobs,
} from "@/features/docs/pdf-studio/lib/process-conversion-job";

describe("pdf studio conversion job processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips jobs that cannot be claimed", async () => {
    vi.mocked(claimPdfStudioConversionJob).mockResolvedValue(false);

    const result = await processPdfStudioConversionJob("job-1");

    expect(result).toEqual({ processed: false });
    expect(db.jobLog.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("claims jobs against the caller org when one is provided", async () => {
    vi.mocked(claimPdfStudioConversionJobForOrg).mockResolvedValue(false);

    const result = await processPdfStudioConversionJob("job-1", "org-1");

    expect(result).toEqual({ processed: false });
    expect(claimPdfStudioConversionJobForOrg).toHaveBeenCalledWith("job-1", "org-1");
    expect(claimPdfStudioConversionJob).not.toHaveBeenCalled();
  });

  it("records an actionable failure when the queued payload is incomplete", async () => {
    vi.mocked(claimPdfStudioConversionJob).mockResolvedValue(true);
    vi.mocked(db.jobLog.findUniqueOrThrow).mockResolvedValue({
      id: "job-1",
      payload: {},
    } as never);

    const result = await processPdfStudioConversionJob("job-1");

    expect(result).toEqual({ processed: true, success: false });
    expect(markPdfStudioConversionFailed).toHaveBeenCalledWith({
      jobId: "job-1",
      code: "conversion_failed",
      message: "The queued conversion job is missing its conversion target.",
      retryable: true,
    });
  });

  it("completes a claimed conversion and falls back to the generic document name when no source file exists", async () => {
    vi.mocked(claimPdfStudioConversionJob).mockResolvedValue(true);
    vi.mocked(db.jobLog.findUniqueOrThrow).mockResolvedValue({
      id: "job-1",
      payload: {
        toolId: "html-to-pdf",
        targetFormat: "pdf",
        options: {
          pageSize: "A4",
          margin: "12mm",
          preferPrintCss: true,
        },
      },
    } as never);
    vi.mocked(runServerConversion).mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: "application/pdf",
    });

    const result = await processPdfStudioConversionJob("job-1");

    expect(result).toEqual({ processed: true, success: true });
    expect(runServerConversion).toHaveBeenCalledWith({
      toolId: "html-to-pdf",
      sourceStorageKey: undefined,
      sourceUrl: undefined,
      options: {
        pageSize: "A4",
        margin: "12mm",
        preferPrintCss: true,
      },
    });
    expect(markPdfStudioConversionComplete).toHaveBeenCalledWith({
      jobId: "job-1",
      toolId: "html-to-pdf",
      targetFormat: "pdf",
      sourceFileName: "document",
      outputBytes: new Uint8Array([1, 2, 3]),
      mimeType: "application/pdf",
    });
  });

  it("marks permanent validation failures without retrying", async () => {
    vi.mocked(claimPdfStudioConversionJob).mockResolvedValue(true);
    vi.mocked(db.jobLog.findUniqueOrThrow).mockResolvedValue({
      id: "job-1",
      payload: {
        toolId: "word-to-pdf",
        targetFormat: "pdf",
        sourceStorageKey: "org/job-1/source.docx",
        sourceFileName: "broken.docx",
      },
    } as never);
    vi.mocked(runServerConversion).mockRejectedValue(
      new PdfStudioConversionError({
        code: "malformed_docx",
        message: "The DOCX file could not be rendered.",
        retryable: false,
        status: 422,
      }),
    );

    const result = await processPdfStudioConversionJob("job-1");

    expect(result).toEqual({ processed: true, success: false });
    expect(markPdfStudioConversionFailed).toHaveBeenCalledWith({
      jobId: "job-1",
      code: "malformed_docx",
      message: "The DOCX file could not be rendered.",
      retryable: false,
    });
  });

  it("summarizes mixed retry queue outcomes", async () => {
    vi.mocked(listRetryablePdfStudioConversionJobs).mockResolvedValue([
      { id: "job-success" },
      { id: "job-failure" },
    ] as never);
    vi.mocked(claimPdfStudioConversionJob).mockResolvedValue(true);
    vi.mocked(db.jobLog.findUniqueOrThrow)
      .mockResolvedValueOnce({
        id: "job-success",
        payload: {
          toolId: "pdf-to-word",
          targetFormat: "docx",
          sourceStorageKey: "org/job-success/source.pdf",
          sourceFileName: "source.pdf",
        },
      } as never)
      .mockResolvedValueOnce({
        id: "job-failure",
        payload: {
          toolId: "pdf-to-ppt",
          targetFormat: "pptx",
          sourceStorageKey: "org/job-failure/source.pdf",
          sourceFileName: "source.pdf",
        },
      } as never);
    vi.mocked(runServerConversion)
      .mockResolvedValueOnce({
        bytes: new Uint8Array([4, 5, 6]),
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
      .mockRejectedValueOnce(
        new PdfStudioConversionError({
          code: "password_protected",
          message: "Password-protected PDFs must be unlocked before export.",
          retryable: false,
          status: 422,
        }),
      );

    const result = await processPendingPdfStudioConversionJobs(5);

    expect(result).toEqual({
      processed: 2,
      succeeded: 1,
      failed: 1,
    });
    expect(markPdfStudioConversionComplete).toHaveBeenCalledTimes(1);
    expect(markPdfStudioConversionFailed).toHaveBeenCalledWith({
      jobId: "job-failure",
      code: "password_protected",
      message: "Password-protected PDFs must be unlocked before export.",
      retryable: false,
    });
  });
});
