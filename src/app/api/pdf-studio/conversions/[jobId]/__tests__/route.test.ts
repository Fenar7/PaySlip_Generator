import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/conversion-jobs", () => ({
  getPdfStudioConversionJob: vi.fn(),
}));

import { getOrgContext } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { getPdfStudioConversionJob } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { GET } from "../route";

describe("GET /api/pdf-studio/conversions/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkFeature).mockResolvedValue(true);
  });

  it("requires an authenticated workspace user", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ jobId: "job-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("does not expose jobs outside the caller org", async () => {
    vi.mocked(getOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);
    vi.mocked(getPdfStudioConversionJob).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ jobId: "job-foreign" }),
    });

    expect(response.status).toBe(404);
    expect(getPdfStudioConversionJob).toHaveBeenCalledWith("job-foreign", "org-1");
  });

  it("returns job diagnostics including failure codes when the job exists", async () => {
    vi.mocked(getOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);
    vi.mocked(getPdfStudioConversionJob).mockResolvedValue({
      jobId: "job-1",
      status: "dead_letter",
      error: "The PDF is malformed.",
      failureCode: "malformed_pdf",
      attempts: 2,
      payload: {
        toolId: "pdf-to-word",
        targetFormat: "docx",
      },
      totalItems: 1,
      completedItems: 0,
      failedItems: 1,
      canRetry: false,
    } as never);

    const response = await GET(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ jobId: "job-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.failureCode).toBe("malformed_pdf");
    expect(body.error).toBe("The PDF is malformed.");
  });

  it("requires PDF Studio tool access", async () => {
    vi.mocked(getOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);
    vi.mocked(checkFeature).mockResolvedValue(false);

    const response = await GET(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ jobId: "job-1" }),
    });

    expect(response.status).toBe(403);
    expect(getPdfStudioConversionJob).not.toHaveBeenCalled();
  });
});
