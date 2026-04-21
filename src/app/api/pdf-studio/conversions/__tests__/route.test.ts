import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/conversion-jobs", () => ({
  createPdfStudioConversionJob: vi.fn(),
}));

import { getOrgContext } from "@/lib/auth";
import { createPdfStudioConversionJob } from "@/features/docs/pdf-studio/lib/conversion-jobs";
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

describe("POST /api/pdf-studio/conversions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
    vi.mocked(getOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);
    vi.mocked(createPdfStudioConversionJob).mockResolvedValue("job-1");
  });

  it("returns 401 when the workspace user is missing", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);

    const response = await POST(
      makeRequest({
        toolId: "html-to-pdf",
        targetFormat: "pdf",
        sourceUrl: "https://example.com/report",
      }),
    );

    expect(response.status).toBe(401);
    expect(createPdfStudioConversionJob).not.toHaveBeenCalled();
  });

  it("rejects unsupported conversion tool requests", async () => {
    const response = await POST(
      makeRequest({
        toolId: "protect",
        targetFormat: "pdf",
        sourceUrl: "https://example.com/report",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Unsupported conversion request.");
    expect(createPdfStudioConversionJob).not.toHaveBeenCalled();
  });

  it("requires either a file upload or source URL", async () => {
    const response = await POST(
      makeRequest({
        toolId: "html-to-pdf",
        targetFormat: "pdf",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Upload a source file or provide a public URL before starting the conversion.",
    );
    expect(createPdfStudioConversionJob).not.toHaveBeenCalled();
  });

  it("creates a queued HTML-to-PDF job with normalized options and kicks processing", async () => {
    const response = await POST(
      makeRequest(
        {
          toolId: "html-to-pdf",
          targetFormat: "pdf",
          sourceUrl: "https://example.com/printable",
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
    });
    expect(createPdfStudioConversionJob).toHaveBeenCalledWith({
      orgId: "org-1",
      userId: "user-1",
      toolId: "html-to-pdf",
      targetFormat: "pdf",
      sourceFile: undefined,
      sourceUrl: "https://example.com/printable",
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

  it("accepts uploaded files for word-to-pdf jobs", async () => {
    const sourceFile = new File(["doc"], "offer.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const response = await POST(
      makeRequest({
        toolId: "word-to-pdf",
        targetFormat: "pdf",
        file: sourceFile,
      }),
    );

    expect(response.status).toBe(202);
    expect(createPdfStudioConversionJob).toHaveBeenCalledTimes(1);
    const call = vi.mocked(createPdfStudioConversionJob).mock.calls[0][0];
    expect(call.orgId).toBe("org-1");
    expect(call.userId).toBe("user-1");
    expect(call.toolId).toBe("word-to-pdf");
    expect(call.targetFormat).toBe("pdf");
    expect(call.sourceUrl).toBeUndefined();
    expect(call.options).toEqual({
      pageSize: undefined,
      margin: undefined,
      preferPrintCss: false,
    });
    expect(call.sourceFile).toBeDefined();
    expect(call.sourceFile?.type).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });
});
