import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getAuthRoutingContext: vi.fn(),
}));

vi.mock("@/lib/onboarding-tracker", () => ({
  getOnboardingStatus: vi.fn(),
  dismissOnboarding: vi.fn(),
}));

import { getAuthRoutingContext } from "@/lib/auth";
import {
  getOnboardingStatus,
  dismissOnboarding,
} from "@/lib/onboarding-tracker";
import { GET as getStatus } from "../status/route";
import { POST as dismiss } from "../dismiss/route";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url), init);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("onboarding API routes", () => {
  it("returns 401 for unauthenticated status requests", async () => {
    vi.mocked(getAuthRoutingContext).mockResolvedValue({
      isAuthenticated: false,
    } as never);

    const response = await getStatus(
      makeRequest("http://localhost/api/onboarding/status?userId=forged-user"),
    );

    expect(response.status).toBe(401);
    expect(getOnboardingStatus).not.toHaveBeenCalled();
  });

  it("derives onboarding status userId from auth context", async () => {
    vi.mocked(getAuthRoutingContext).mockResolvedValue({
      isAuthenticated: true,
      userId: "real-user",
      hasOrg: false,
    } as never);
    vi.mocked(getOnboardingStatus).mockResolvedValue({
      steps: {} as never,
      completedCount: 0,
      totalSteps: 7,
      percentComplete: 0,
      isComplete: false,
      isDismissed: false,
    });

    const response = await getStatus(
      makeRequest("http://localhost/api/onboarding/status?userId=forged-user"),
    );

    expect(response.status).toBe(200);
    expect(getOnboardingStatus).toHaveBeenCalledWith("real-user");
  });

  it("ignores forged userId bodies when dismissing onboarding", async () => {
    vi.mocked(getAuthRoutingContext).mockResolvedValue({
      isAuthenticated: true,
      userId: "real-user",
      hasOrg: true,
      orgId: "org-1",
      role: "admin",
    } as never);

    const response = await dismiss(
      makeRequest("http://localhost/api/onboarding/dismiss", {
        method: "POST",
        body: JSON.stringify({ userId: "forged-user" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(dismissOnboarding).toHaveBeenCalledWith("real-user");
  });
});
