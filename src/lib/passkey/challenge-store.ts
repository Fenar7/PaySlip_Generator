import "server-only";
import { db } from "@/lib/db";
import type { ChallengePurpose } from "./server";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function storeChallenge(
  userId: string,
  purpose: ChallengePurpose,
  challenge: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  await db.webAuthnChallenge.create({
    data: { userId, purpose, challenge, consumed: false, expiresAt },
  });
}

export async function consumeChallenge(
  userId: string,
  purpose: ChallengePurpose,
  expectedChallenge: string
): Promise<boolean> {
  const rows = await db.webAuthnChallenge.findMany({
    where: {
      userId,
      purpose,
      consumed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  const row = rows[0];
  if (!row) return false;

  // Constant-time comparison to avoid timing leaks
  if (row.challenge.length !== expectedChallenge.length) {
    await db.webAuthnChallenge.update({
      where: { id: row.id },
      data: { consumed: true },
    });
    return false;
  }

  let result = 0;
  for (let i = 0; i < row.challenge.length; i++) {
    result |= row.challenge.charCodeAt(i) ^ expectedChallenge.charCodeAt(i);
  }

  // Mark consumed regardless of match (single-use)
  await db.webAuthnChallenge.update({
    where: { id: row.id },
    data: { consumed: true },
  });

  return result === 0;
}

export async function getAndConsumeChallenge(
  userId: string,
  purpose: ChallengePurpose
): Promise<string | null> {
  const rows = await db.webAuthnChallenge.findMany({
    where: {
      userId,
      purpose,
      consumed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  const row = rows[0];
  if (!row) return null;

  await db.webAuthnChallenge.update({
    where: { id: row.id },
    data: { consumed: true },
  });

  return row.challenge;
}

/**
 * Delete expired and consumed challenges older than a safety window.
 * Call this periodically (e.g., via a cron job or at challenge creation time
 * with a rate-limited frequency).
 */
export async function cleanupOldChallenges(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
  const result = await db.webAuthnChallenge.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { consumed: true, createdAt: { lt: cutoff } },
      ],
    },
  });
  return result.count;
}
