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

/**
 * Atomically consume a challenge: find the latest unconsumed, unexpired
 * challenge for this user+purpose, then claim it with an atomic
 * updateMany(where: { id, consumed: false }). Only one concurrent caller
 * will get count=1; all others get count=0 (fail-closed).
 *
 * Constant-time comparison is applied to the challenge value to avoid
 * timing leaks.
 */
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

  // Atomic claim: only succeeds if still unconsumed
  const claimed = await db.webAuthnChallenge.updateMany({
    where: { id: row.id, consumed: false },
    data: { consumed: true },
  });
  if (claimed.count === 0) return false;

  // Constant-time comparison (challenge already claimed, so safe to compare)
  if (row.challenge.length !== expectedChallenge.length) return false;
  let result = 0;
  for (let i = 0; i < row.challenge.length; i++) {
    result |= row.challenge.charCodeAt(i) ^ expectedChallenge.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Atomically consume and return a challenge: find the latest unconsumed,
 * unexpired challenge for this user+purpose, then claim it with an atomic
 * updateMany(where: { id, consumed: false }). Only one concurrent caller
 * will get count=1; all others get count=0 (fail-closed).
 */
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

  // Atomic claim: only succeeds if still unconsumed
  const claimed = await db.webAuthnChallenge.updateMany({
    where: { id: row.id, consumed: false },
    data: { consumed: true },
  });
  if (claimed.count === 0) return null;

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