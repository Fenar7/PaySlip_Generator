import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockGetAuth, mockGetStatus, mockRedirect } = vi.hoisted(() => ({
  mockGetAuth: vi.fn(),
  mockGetStatus: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthRoutingContext: mockGetAuth,
}));
vi.mock("@/lib/onboarding-tracker", () => ({
  getOnboardingStatus: mockGetStatus,
}));
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

import OnboardingPage from "../page";

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * reduirect() from next/navigation is mocked so we can assert the target
 * path without relying on Next.js internal redirect mechanics.
 */
describe("OnboardingPage route guard", () => {
  it("redirects unauthenticated users to login", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: false,
      loginPath: "/auth/login",
    });

    await OnboardingPage();

    expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
  });

  it("renders onboarding client when user is authenticated but has no org", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      hasOrg: false,
    });

    await OnboardingPage();

    // No redirect — the client component is rendered
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects to /app/home when onboarding is fully complete", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      hasOrg: true,
      orgId: "org-1",
      orgName: "Test",
      orgSlug: "test",
      role: "owner",
    });

    mockGetStatus.mockResolvedValue({
      steps: {
        accountCreated: true,
        emailVerified: true,
        orgSetup: true,
        firstDocCreated: true,
        firstDocExported: true,
        teamMemberInvited: true,
        recurringSetup: true,
        documentNumbering: true,
      },
      completedCount: 8,
      totalSteps: 8,
      percentComplete: 100,
      isComplete: true,
      isDismissed: false,
    });

    await OnboardingPage();

    expect(mockRedirect).toHaveBeenCalledWith("/app/home");
  });

  it("allows re-entry when onboarding is incomplete (has org but documentNumbering not done)", async () => {
    mockGetAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      hasOrg: true,
      orgId: "org-1",
      orgName: "Test",
      orgSlug: "test",
      role: "owner",
    });

    mockGetStatus.mockResolvedValue({
      steps: {
        accountCreated: true,
        emailVerified: true,
        orgSetup: true,
        firstDocCreated: false,
        firstDocExported: false,
        teamMemberInvited: false,
        recurringSetup: false,
        documentNumbering: false,
      },
      completedCount: 3,
      totalSteps: 8,
      percentComplete: 37,
      isComplete: false,
      isDismissed: false,
    });

    await OnboardingPage();

    // No redirect — user can resume onboarding
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
