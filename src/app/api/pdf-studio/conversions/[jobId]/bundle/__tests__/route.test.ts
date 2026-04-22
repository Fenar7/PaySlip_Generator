import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/conversion-jobs", () => ({
  getPdfStudioConversionBundle: vi.fn(),
}));

import { getOrgContext } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { getPdfStudioConversionBundle } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { GET } from "../route";

describe("GET /api/pdf-studio/conversions/[jobId]/bundle", () => {
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

  it("streams a completed batch bundle", async () => {
    vi.mocked(getOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);
    vi.mocked(getPdfStudioConversionBundle).mockResolvedValue({
      fileName: "Board-Pack-batch-02.zip",
      bytes: new Uint8Array([1, 2, 3, 4]),
    } as never);

    const response = await GET(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ jobId: "job-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toContain(
      "Board-Pack-batch-02.zip",
    );
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
    expect(getPdfStudioConversionBundle).not.toHaveBeenCalled();
  });
});
