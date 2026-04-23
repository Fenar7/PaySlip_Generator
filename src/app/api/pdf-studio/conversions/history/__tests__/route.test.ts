import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getOrgContext: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn(),
  getOrgPlan: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/lib/conversion-jobs", () => ({
  listPdfStudioConversionHistory: vi.fn(),
}));

import { getOrgContext } from "@/lib/auth";
import { checkFeature, getOrgPlan } from "@/lib/plans/enforcement";
import { listPdfStudioConversionHistory } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { GET } from "../route";

describe("GET /api/pdf-studio/conversions/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkFeature).mockResolvedValue(true);
    vi.mocked(getOrgPlan).mockResolvedValue({
      planId: "starter",
      planName: "Starter",
      status: "active",
      trialEndsAt: null,
      isTrialing: false,
      isFree: false,
      limits: {} as never,
    });
  });

  it("requires an authenticated workspace user", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/pdf-studio/conversions/history") as NextRequest,
    );

    expect(response.status).toBe(401);
  });

  it("lists recent conversion jobs for the active tool", async () => {
    vi.mocked(getOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);
    vi.mocked(listPdfStudioConversionHistory).mockResolvedValue([
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
    ] as never);

    const response = await GET(
      new Request(
        "http://localhost/api/pdf-studio/conversions/history?toolId=pdf-to-word&limit=5",
      ) as NextRequest,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.meta).toEqual({
      historyLimit: 5,
      planId: "starter",
    });
    expect(listPdfStudioConversionHistory).toHaveBeenCalledWith({
      orgId: "org-1",
      toolId: "pdf-to-word",
      limit: 5,
    });
  });

  it.each([
    ["starter", 10],
    ["pro", 25],
    ["enterprise", 50],
  ] as const)(
    "clamps requested history to the %s plan window",
    async (planId, expectedLimit) => {
      vi.mocked(getOrgContext).mockResolvedValue({
        orgId: "org-1",
        userId: "user-1",
        role: "ADMIN",
      } as never);
      vi.mocked(getOrgPlan).mockResolvedValue({
        planId,
        planName: planId,
        status: "active",
        trialEndsAt: null,
        isTrialing: false,
        isFree: false,
        limits: {} as never,
      });
      vi.mocked(listPdfStudioConversionHistory).mockResolvedValue([] as never);

      const response = await GET(
        new Request(
          "http://localhost/api/pdf-studio/conversions/history?toolId=pdf-to-word&limit=999",
        ) as NextRequest,
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.meta).toEqual({
        historyLimit: expectedLimit,
        planId,
      });
      expect(listPdfStudioConversionHistory).toHaveBeenCalledWith({
        orgId: "org-1",
        toolId: "pdf-to-word",
        limit: expectedLimit,
      });
    },
  );

  it("requires PDF Studio tool access", async () => {
    vi.mocked(getOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    } as never);
    vi.mocked(checkFeature).mockResolvedValue(false);

    const response = await GET(
      new Request("http://localhost/api/pdf-studio/conversions/history") as NextRequest,
    );

    expect(response.status).toBe(403);
    expect(listPdfStudioConversionHistory).not.toHaveBeenCalled();
  });
});
