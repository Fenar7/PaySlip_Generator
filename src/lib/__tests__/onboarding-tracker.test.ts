import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    onboardingProgress: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { getOnboardingStatus, completeOnboardingStep, dismissOnboarding } from "../onboarding-tracker";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("onboarding-tracker", () => {
  it("includes documentNumbering in ALL_STEPS via getOnboardingStatus", async () => {
    mockDb.onboardingProgress.findUnique.mockResolvedValue({
      accountCreated: false,
      emailVerified: false,
      orgSetup: false,
      firstDocCreated: false,
      firstDocExported: false,
      teamMemberInvited: false,
      recurringSetup: false,
      documentNumbering: false,
      completedAt: null,
      dismissedAt: null,
    });

    const status = await getOnboardingStatus("user-1");

    expect(status.totalSteps).toBe(8);
    expect(status.steps).toHaveProperty("documentNumbering");
    expect(status.steps.documentNumbering).toBe(false);
  });

  it("creates onboarding progress with documentNumbering when none exists", async () => {
    mockDb.onboardingProgress.findUnique.mockResolvedValue(null);
    mockDb.onboardingProgress.create.mockResolvedValue({
      accountCreated: true,
      emailVerified: false,
      orgSetup: false,
      firstDocCreated: false,
      firstDocExported: false,
      teamMemberInvited: false,
      recurringSetup: false,
      documentNumbering: false,
    });

    await getOnboardingStatus("user-2");

    expect(mockDb.onboardingProgress.create).toHaveBeenCalledWith({
      data: { userId: "user-2", accountCreated: true },
    });
  });

  it("marks documentNumbering step as complete via completeOnboardingStep", async () => {
    mockDb.onboardingProgress.upsert.mockResolvedValue({});
    mockDb.onboardingProgress.findUnique.mockResolvedValue({
      accountCreated: true,
      emailVerified: true,
      orgSetup: true,
      firstDocCreated: true,
      firstDocExported: true,
      teamMemberInvited: true,
      recurringSetup: true,
      documentNumbering: false,
      completedAt: null,
      dismissedAt: null,
    });

    await completeOnboardingStep("user-3", "documentNumbering");

    expect(mockDb.onboardingProgress.upsert).toHaveBeenCalledWith({
      where: { userId: "user-3" },
      create: { userId: "user-3", documentNumbering: true },
      update: { documentNumbering: true },
    });
  });
});
