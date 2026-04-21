import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/conversion-jobs", () => ({
  getPdfStudioConversionJob: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/process-conversion-job", () => ({
  processPdfStudioConversionJob: vi.fn(),
}));

import { getOrgContext } from "@/lib/auth";
import { getPdfStudioConversionJob } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { processPdfStudioConversionJob } from "@/features/docs/pdf-studio/lib/process-conversion-job";
import { POST } from "../route";

describe("POST /api/pdf-studio/conversions/[jobId]/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);
  });

  it("returns 401 when the workspace user is missing", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ jobId: "job-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 for jobs outside the active org", async () => {
    vi.mocked(getPdfStudioConversionJob).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ jobId: "job-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Conversion job not found.");
    expect(processPdfStudioConversionJob).not.toHaveBeenCalled();
  });

  it("processes an accessible job within the caller org", async () => {
    vi.mocked(getPdfStudioConversionJob).mockResolvedValue({
      jobId: "job-1",
      status: "pending",
    } as never);
    vi.mocked(processPdfStudioConversionJob).mockResolvedValue({
      processed: true,
      success: true,
    });

    const response = await POST(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ jobId: "job-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({ processed: true, success: true });
    expect(processPdfStudioConversionJob).toHaveBeenCalledWith("job-1", "org-1");
  });
});
