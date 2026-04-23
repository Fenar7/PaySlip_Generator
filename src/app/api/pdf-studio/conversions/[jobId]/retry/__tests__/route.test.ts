import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/conversion-jobs", () => ({
  retryPdfStudioConversionJob: vi.fn(),
}));

import { getOrgContext } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { retryPdfStudioConversionJob } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { POST } from "../route";

describe("POST /api/pdf-studio/conversions/[jobId]/retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
    vi.mocked(checkFeature).mockResolvedValue(true);
    vi.mocked(getOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);
  });

  it("requires an authenticated workspace user", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ jobId: "job-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when the job is unavailable to the active org", async () => {
    vi.mocked(retryPdfStudioConversionJob).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ jobId: "job-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("requires PDF Studio tool access", async () => {
    vi.mocked(checkFeature).mockResolvedValue(false);

    const response = await POST(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ jobId: "job-1" }),
    });

    expect(response.status).toBe(403);
    expect(retryPdfStudioConversionJob).not.toHaveBeenCalled();
  });

  it("requeues a retryable failed job and triggers processing", async () => {
    vi.mocked(retryPdfStudioConversionJob).mockResolvedValue({
      jobId: "job-1",
      status: "pending",
      totalItems: 3,
      completedItems: 1,
      failedItems: 0,
      attempts: 3,
      payload: {
        toolId: "pdf-to-word",
        targetFormat: "docx",
      },
      canRetry: false,
    } as never);

    const response = await POST(
      new Request("http://localhost", {
        headers: { cookie: "sb=token" },
      }) as NextRequest,
      {
        params: Promise.resolve({ jobId: "job-1" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.status).toBe("pending");
    expect(retryPdfStudioConversionJob).toHaveBeenCalledWith("job-1", "org-1");
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
});
