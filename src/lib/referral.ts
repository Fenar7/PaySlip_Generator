import "server-only";

import { db } from "@/lib/db";
import { nanoid } from "nanoid";

// Generate a unique referral code
export function generateReferralCode(): string {
  return nanoid(8).toUpperCase();
}

// Create or get referral code for a user
export async function getOrCreateReferralCode(
  userId: string,
): Promise<string> {
  const existing = await db.referral.findFirst({
    where: { referrerId: userId, referredOrgId: null },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return existing.referralCode;

  const code = generateReferralCode();
  await db.referral.create({
    data: {
      referrerId: userId,
      referralCode: code,
      status: "pending",
    },
  });

  return code;
}

// Record a referral conversion (when invited user creates an org)
export async function convertReferral(
  referralCode: string,
  newOrgId: string,
): Promise<boolean> {
  try {
    const referral = await db.referral.findUnique({
      where: { referralCode },
    });
    if (!referral || referral.status !== "pending") return false;

    await db.referral.update({
      where: { id: referral.id },
      data: {
        referredOrgId: newOrgId,
        status: "converted",
        convertedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error("Failed to convert referral:", error);
    return false;
  }
}

// Apply referral credits (e.g., extend trial by 7 days for both)
export async function applyReferralCredits(
  referralId: string,
): Promise<void> {
  try {
    await db.referral.update({
      where: { id: referralId },
      data: {
        creditApplied: true,
        referrerCredit: true,
        creditedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to apply referral credits:", error);
  }
}

// Get referral stats for a user
export async function getReferralStats(userId: string) {
  const referrals = await db.referral.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: "desc" },
  });

  return {
    totalReferrals: referrals.length,
    converted: referrals.filter((r) => r.status === "converted").length,
    pending: referrals.filter((r) => r.status === "pending").length,
    creditsApplied: referrals.filter((r) => r.creditApplied).length,
    referrals,
  };
}
