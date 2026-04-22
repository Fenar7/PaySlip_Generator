import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  RATE_LIMITS: {
    export: { maxRequests: 10, window: "60 s" },
  },
  rateLimitByOrg: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/conversion-jobs", () => ({
  countActivePdfStudioConversionJobs: vi.fn(),
  createPdfStudioConversionJob: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/server-conversion-policy", () => ({
  PDF_STUDIO_CONVERSION_ACTIVE_JOB_LIMIT: 3,
  validatePdfStudioBatchConversionRequest: vi.fn(),
  validatePdfStudioConversionRequest: vi.fn(),
}));

import { getOrgContext } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { rateLimitByOrg } from "@/lib/rate-limit";
import {
  countActivePdfStudioConversionJobs,
  createPdfStudioConversionJob,
} from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { PdfStudioConversionError } from "@/features/docs/pdf-studio/lib/conversion-errors";
import {
  validatePdfStudioBatchConversionRequest,
  validatePdfStudioConversionRequest,
} from "@/features/docs/pdf-studio/lib/server-conversion-policy";
import { POST } from "../route";

function makeRequest(
  fields: Record<string, string | File>,
  options?: { cookie?: string },
) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value instanceof File) {
      formData.append(key, value, value.name);
      continue;
    }
    formData.append(key, value);
  }
  return new Request("http://localhost/api/pdf-studio/conversions", {
    method: "POST",
    headers: options?.cookie ? { cookie: options.cookie } : undefined,
    body: formData,
  }) as NextRequest;
}

function makeBatchRequest(
  fields: Record<string, string>,
  files: File[],
  options?: { cookie?: string },
) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  for (const file of files) {
    formData.append("files", file, file.name);
  }
  return new Request("http://localhost/api/pdf-studio/conversions", {
    method: "POST",
    headers: options?.cookie ? { cookie: options.cookie } : undefined,
    body: formData,
  }) as NextRequest;
}

describe("POST /api/pdf-studio/conversions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
    vi.mocked(getOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);
    vi.mocked(checkFeature).mockResolvedValue(true);
    vi.mocked(rateLimitByOrg).mockResolvedValue({
      success: true,
      remaining: 9,
    });
    vi.mocked(countActivePdfStudioConversionJobs).mockResolvedValue(0);
    vi.mocked(validatePdfStudioConversionRequest).mockResolvedValue({
      sourceFile: undefined,
      sourceBytes: undefined,
      options: {
        pageSize: "A4",
        margin: "10mm",
        preferPrintCss: true,
      },
    });
    vi.mocked(validatePdfStudioBatchConversionRequest).mockResolvedValue({
      sources: [],
      options: {
        pageSize: "A4",
        margin: "10mm",
        preferPrintCss: true,
      },
    });
    vi.mocked(createPdfStudioConversionJob).mockResolvedValue("job-1");
  });

  it("returns 401 when the workspace user is missing", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);

    const response = await POST(
      makeRequest({
        toolId: "html-to-pdf",
        targetFormat: "pdf",
      }),
    );

    expect(response.status).toBe(401);
    expect(createPdfStudioConversionJob).not.toHaveBeenCalled();
  });

  it("blocks workspaces without PDF Studio entitlements", async () => {
    vi.mocked(checkFeature).mockResolvedValue(false);

    const response = await POST(
      makeRequest({
        toolId: "html-to-pdf",
        targetFormat: "pdf",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("PDF Studio conversions require a plan");
    expect(createPdfStudioConversionJob).not.toHaveBeenCalled();
  });

  it("rate-limits expensive conversion requests", async () => {
    vi.mocked(rateLimitByOrg).mockResolvedValue({
      success: false,
      remaining: 0,
      retryAfter: 120,
    });

    const response = await POST(
      makeRequest({
        toolId: "pdf-to-word",
        targetFormat: "docx",
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(createPdfStudioConversionJob).not.toHaveBeenCalled();
  });

  it("caps each org at a small number of active queued conversions", async () => {
    vi.mocked(countActivePdfStudioConversionJobs).mockResolvedValue(3);

    const response = await POST(
      makeRequest({
        toolId: "pdf-to-word",
        targetFormat: "docx",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toContain("Wait for one of your existing PDF Studio conversions");
    expect(createPdfStudioConversionJob).not.toHaveBeenCalled();
  });

  it("rejects unsupported conversion tool requests", async () => {
    const response = await POST(
      makeRequest({
        toolId: "protect",
        targetFormat: "pdf",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Unsupported conversion request.");
    expect(createPdfStudioConversionJob).not.toHaveBeenCalled();
  });

  it("returns actionable validation errors before storage upload", async () => {
    vi.mocked(validatePdfStudioConversionRequest).mockRejectedValue(
      new PdfStudioConversionError({
        code: "html_remote_disabled",
        message: "Remote URL rendering is disabled for HTML to PDF.",
        status: 422,
      }),
    );

    const response = await POST(
      makeRequest({
        toolId: "html-to-pdf",
        targetFormat: "pdf",
        sourceUrl: "https://example.com/report",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.code).toBe("html_remote_disabled");
    expect(body.error).toBe("Remote URL rendering is disabled for HTML to PDF.");
    expect(createPdfStudioConversionJob).not.toHaveBeenCalled();
  });

  it("creates a queued conversion job with normalized validated inputs and kicks processing", async () => {
    const sourceFile = new File(["<html><body>Hello</body></html>"], "report.html", {
      type: "text/html",
    });
    vi.mocked(validatePdfStudioConversionRequest).mockResolvedValue({
      sourceFile,
      sourceBytes: new Uint8Array(Buffer.from("<html><body>Hello</body></html>")),
      options: {
        pageSize: "A4",
        margin: "10mm",
        preferPrintCss: true,
      },
    });

    const response = await POST(
      makeRequest(
        {
          toolId: "html-to-pdf",
          targetFormat: "pdf",
          file: sourceFile,
          pageSize: "A4",
          margin: "10mm",
          preferPrintCss: "true",
        },
        { cookie: "sb=token" },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      jobId: "job-1",
      status: "pending",
      totalItems: 1,
      completedItems: 0,
      failedItems: 0,
    });
    const validateCall = vi.mocked(validatePdfStudioConversionRequest).mock.calls[0]?.[0];
    expect(validateCall).toMatchObject({
      toolId: "html-to-pdf",
      targetFormat: "pdf",
      sourceUrl: undefined,
      options: {
        pageSize: "A4",
        margin: "10mm",
        preferPrintCss: true,
      },
    });
    expect(validateCall?.sourceFile?.type).toBe("text/html");
    expect(vi.mocked(createPdfStudioConversionJob).mock.calls[0]?.[0]).toMatchObject({
      orgId: "org-1",
      userId: "user-1",
      toolId: "html-to-pdf",
      targetFormat: "pdf",
      sourceBytes: new Uint8Array(Buffer.from("<html><body>Hello</body></html>")),
      options: {
        pageSize: "A4",
        margin: "10mm",
        preferPrintCss: true,
      },
    });
    expect(fetch).toHaveBeenCalledWith(
      new URL("http://localhost/api/pdf-studio/conversions/job-1/process"),
      {
        method: "POST",
        headers: {
          cookie: "sb=token",
        },
      },
    );
  });

  it("queues multi-file batch conversions as one tracked job", async () => {
    const firstFile = new File(["%PDF-1.7 first"], "chapter-1.pdf", {
      type: "application/pdf",
    });
    const secondFile = new File(["%PDF-1.7 second"], "chapter-2.pdf", {
      type: "application/pdf",
    });

    vi.mocked(validatePdfStudioBatchConversionRequest).mockResolvedValue({
      sources: [
        {
          sourceFile: firstFile,
          sourceBytes: new Uint8Array(Buffer.from("%PDF-1.7 first")),
          pageCount: 2,
        },
        {
          sourceFile: secondFile,
          sourceBytes: new Uint8Array(Buffer.from("%PDF-1.7 second")),
          pageCount: 3,
        },
      ],
      options: {
        pageSize: "A4",
        margin: "10mm",
        preferPrintCss: false,
      },
    });

    const response = await POST(
      makeBatchRequest(
        {
        toolId: "pdf-to-word",
        targetFormat: "docx",
        },
        [firstFile, secondFile],
        { cookie: "sb=token" },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      jobId: "job-1",
      status: "pending",
      totalItems: 2,
      completedItems: 0,
      failedItems: 0,
    });
    expect(validatePdfStudioConversionRequest).not.toHaveBeenCalled();
    const validateBatchCall = vi.mocked(validatePdfStudioBatchConversionRequest).mock.calls[0]?.[0];
    expect(validateBatchCall).toMatchObject({
      toolId: "pdf-to-word",
      targetFormat: "docx",
      options: {
        pageSize: undefined,
        margin: undefined,
        preferPrintCss: false,
      },
    });
    expect(validateBatchCall?.sourceFiles).toHaveLength(2);
    expect(vi.mocked(createPdfStudioConversionJob).mock.calls[0]?.[0]).toMatchObject({
      orgId: "org-1",
      userId: "user-1",
      toolId: "pdf-to-word",
      targetFormat: "docx",
      sourceFiles: [
        {
          file: firstFile,
          bytes: new Uint8Array(Buffer.from("%PDF-1.7 first")),
          pageCount: 2,
        },
        {
          file: secondFile,
          bytes: new Uint8Array(Buffer.from("%PDF-1.7 second")),
          pageCount: 3,
        },
      ],
      options: {
        pageSize: "A4",
        margin: "10mm",
        preferPrintCss: false,
      },
    });
  });
});
