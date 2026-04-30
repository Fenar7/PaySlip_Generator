import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockGetAuth, mockGetStatus, mockRedirect, mockGetSequenceState } = vi.hoisted(() => ({
  mockGetAuth: vi.fn(),
  mockGetStatus: vi.fn(),
  mockRedirect: vi.fn(),
  mockGetSequenceState: vi.fn(),
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
vi.mock("../actions", () => ({
  getOnboardingSequenceState: mockGetSequenceState,
}));

import OnboardingPage from "../page";

beforeEach(() => {
  vi.clearAllMocks();
});

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
      steps: { documentNumbering: true },
      completedCount: 8,
      totalSteps: 8,
      percentComplete: 100,
      isComplete: true,
      isDismissed: false,
    });

    await OnboardingPage();

    expect(mockRedirect).toHaveBeenCalledWith("/app/home");
  });

  it("allows re-entry when onboarding is incomplete and sequences not yet configured", async () => {
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
      steps: { documentNumbering: false },
      completedCount: 3,
      totalSteps: 8,
      percentComplete: 37,
      isComplete: false,
      isDismissed: false,
    });

    mockGetSequenceState.mockResolvedValue({
      invoice: null,
      voucher: null,
      _onboardingComplete: false,
    });

    await OnboardingPage();

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("allows re-entry when onboarding is incomplete but sequences already exist", async () => {
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
      steps: { documentNumbering: false },
      completedCount: 3,
      totalSteps: 8,
      percentComplete: 37,
      isComplete: false,
      isDismissed: false,
    });

    mockGetSequenceState.mockResolvedValue({
      invoice: { formatString: "INV/{YYYY}/{NNNNN}", periodicity: "YEARLY" },
      voucher: { formatString: "VCH/{YYYY}/{NNNNN}", periodicity: "YEARLY" },
      _onboardingComplete: false,
    });

    await OnboardingPage();

    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
