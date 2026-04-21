import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/conversion-jobs", () => ({
  getPdfStudioConversionJob: vi.fn(),
}));

import { getOrgContext } from "@/lib/auth";
import { getPdfStudioConversionJob } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { GET } from "../route";

describe("GET /api/pdf-studio/conversions/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
