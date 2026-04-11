import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    member: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/multi-org", () => ({
  getActiveOrg: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  getOrgPlan: vi.fn(),
}));

vi.mock("@/lib/plans/config", () => ({
  getPlan: vi.fn(),
}));

import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getActiveOrg } from "@/lib/multi-org";
import { getOrgPlan } from "@/lib/plans/enforcement";
import { getPlan } from "@/lib/plans/config";
import { GET } from "../route";

function makeRequest(url: string) {
  return new NextRequest(new URL(url));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createSupabaseServer).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
  } as never);
  vi.mocked(getActiveOrg).mockResolvedValue({
    id: "org-active",
    name: "Acme",
    slug: "acme",
  });
  vi.mocked(getOrgPlan).mockResolvedValue({
    planId: "pro",
    status: "active",
    limits: { apiAccess: true } as never,
    trialEndsAt: null,
  });
  vi.mocked(getPlan).mockReturnValue({
    id: "pro",
    name: "Pro",
  } as never);
});

describe("GET /api/billing/plan", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createSupabaseServer).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as never);

    const response = await GET(makeRequest("http://localhost/api/billing/plan"));

    expect(response.status).toBe(401);
  });

  it("uses the active org when no orgId is supplied", async () => {
    const response = await GET(makeRequest("http://localhost/api/billing/plan"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getActiveOrg).toHaveBeenCalledWith("user-1");
    expect(getOrgPlan).toHaveBeenCalledWith("org-active");
    expect(body.planName).toBe("Pro");
  });

  it("rejects forged orgId values outside the user's membership", async () => {
    vi.mocked(db.member.findUnique).mockResolvedValue(null as never);

    const response = await GET(
      makeRequest("http://localhost/api/billing/plan?orgId=org-other"),
    );

    expect(response.status).toBe(403);
    expect(getOrgPlan).not.toHaveBeenCalled();
  });
});
