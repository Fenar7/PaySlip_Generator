import "server-only";

import { db } from "@/lib/db";

export type OnboardingStep =
  | "accountCreated"
  | "emailVerified"
  | "orgSetup"
  | "firstDocCreated"
  | "firstDocExported"
  | "teamMemberInvited"
  | "recurringSetup"
  | "documentNumbering";

export interface OnboardingStatus {
  steps: Record<OnboardingStep, boolean>;
  completedCount: number;
  totalSteps: number;
  percentComplete: number;
  isComplete: boolean;
  isDismissed: boolean;
}

const ALL_STEPS: OnboardingStep[] = [
  "accountCreated",
  "emailVerified",
  "orgSetup",
  "firstDocCreated",
  "firstDocExported",
  "teamMemberInvited",
  "recurringSetup",
  "documentNumbering",
];

export async function getOnboardingStatus(
  userId: string,
): Promise<OnboardingStatus> {
  let progress = await db.onboardingProgress.findUnique({
    where: { userId },
  });

  if (!progress) {
    progress = await db.onboardingProgress.create({
      data: { userId, accountCreated: true },
    });
  }

  const steps: Record<OnboardingStep, boolean> = {
    accountCreated: progress.accountCreated,
    emailVerified: progress.emailVerified,
    orgSetup: progress.orgSetup,
    firstDocCreated: progress.firstDocCreated,
    firstDocExported: progress.firstDocExported,
    teamMemberInvited: progress.teamMemberInvited,
    recurringSetup: progress.recurringSetup,
    documentNumbering: progress.documentNumbering,
  };

  const completedCount = Object.values(steps).filter(Boolean).length;

  return {
    steps,
    completedCount,
    totalSteps: ALL_STEPS.length,
    percentComplete: Math.round((completedCount / ALL_STEPS.length) * 100),
    isComplete: completedCount === ALL_STEPS.length,
    isDismissed: !!progress.dismissedAt,
  };
}

export async function completeOnboardingStep(
  userId: string,
  step: OnboardingStep,
): Promise<void> {
  try {
    await db.onboardingProgress.upsert({
      where: { userId },
      create: { userId, [step]: true },
      update: { [step]: true },
    });

    // Check if all steps are now complete
    const status = await getOnboardingStatus(userId);
    if (status.isComplete) {
      await db.onboardingProgress.update({
        where: { userId },
        data: { completedAt: new Date() },
      });
    }
  } catch (error) {
    console.error("Failed to update onboarding:", error);
  }
}

export async function dismissOnboarding(userId: string): Promise<void> {
  await db.onboardingProgress.upsert({
    where: { userId },
    create: { userId, dismissedAt: new Date() },
    update: { dismissedAt: new Date() },
  });
}
