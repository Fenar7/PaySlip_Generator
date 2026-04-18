import "server-only";

import { db } from "@/lib/db";
import { computeEntryHash, GENESIS_HASH } from "./forensic";
import { Prisma } from "@/generated/prisma/client";

export interface ChainVerificationResult {
  orgId: string;
  totalEntries: number;
  verified: number;
  status: "INTACT" | "BROKEN" | "EMPTY";
  firstBreakAt?: {
    sequenceNum: number;
    expectedHash: string;
    actualHash: string;
    entryId: string;
  };
  gapsDetected: number[];
  verifiedAt: Date;
  durationMs: number;
}

/**
 * Verify the integrity of the audit chain for an organization.
 * Streams entries in sequenceNum order and checks:
 * 1. Sequential continuity (no gaps)
 * 2. prevHash linkage (each entry's prevHash === previous entry's entryHash)
 * 3. entryHash integrity (recomputed hash matches stored hash)
 */
export async function verifyAuditChain(orgId: string): Promise<ChainVerificationResult> {
  const startTime = Date.now();

  const entries = await db.auditLog.findMany({
    where: { orgId, sequenceNum: { not: null } },
    orderBy: { sequenceNum: "asc" },
    select: {
      id: true,
      sequenceNum: true,
      entryHash: true,
      prevHash: true,
      orgId: true,
      actorId: true,
      representedId: true,
      proxyGrantId: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
    },
  });

  if (entries.length === 0) {
    return {
      orgId,
      totalEntries: 0,
      verified: 0,
      status: "EMPTY",
      gapsDetected: [],
      verifiedAt: new Date(),
      durationMs: Date.now() - startTime,
    };
  }

  const gaps: number[] = [];
  let firstBreak: ChainVerificationResult["firstBreakAt"];
  let verified = 0;
  let expectedPrevHash = GENESIS_HASH;
  let expectedSeq = 1;

  for (const entry of entries) {
    const seq = Number(entry.sequenceNum);

    // Check for sequence gaps
    while (expectedSeq < seq) {
      gaps.push(expectedSeq);
      expectedSeq++;
    }
    expectedSeq = seq + 1;

    // Verify prevHash linkage
    if (!firstBreak && entry.prevHash !== expectedPrevHash) {
      firstBreak = {
        sequenceNum: seq,
        expectedHash: expectedPrevHash,
        actualHash: entry.prevHash ?? "NULL",
        entryId: entry.id,
      };
    }

    // Recompute and verify entryHash
    if (!firstBreak) {
      const recomputed = computeEntryHash({
        sequenceNum: BigInt(seq),
        orgId: entry.orgId,
        actorId: entry.actorId,
        representedId: entry.representedId,
        proxyGrantId: entry.proxyGrantId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
        prevHash: entry.prevHash ?? GENESIS_HASH,
      });

      if (recomputed !== entry.entryHash) {
        firstBreak = {
          sequenceNum: seq,
          expectedHash: recomputed,
          actualHash: entry.entryHash ?? "NULL",
          entryId: entry.id,
        };
      }
    }

    if (!firstBreak) {
      verified++;
    }
    expectedPrevHash = entry.entryHash ?? "";
  }

  const durationMs = Date.now() - startTime;
  const status = firstBreak || gaps.length > 0 ? "BROKEN" : "INTACT";

  return {
    orgId,
    totalEntries: entries.length,
    verified,
    status,
    firstBreakAt: firstBreak,
    gapsDetected: gaps,
    verifiedAt: new Date(),
    durationMs,
  };
}

/**
 * Run verification and persist the result.
 */
export async function runAndPersistVerification(
  orgId: string,
  triggeredBy: string = "MANUAL",
): Promise<ChainVerificationResult> {
  const result = await verifyAuditChain(orgId);

  await db.auditChainVerification.create({
    data: {
      orgId,
      totalEntries: result.totalEntries,
      verifiedEntries: result.verified,
      status: result.status,
      firstBreakSeq: result.firstBreakAt
        ? BigInt(result.firstBreakAt.sequenceNum)
        : null,
      firstBreakHash: result.firstBreakAt?.actualHash ?? null,
      gapsDetected: result.gapsDetected.length > 0
        ? (result.gapsDetected as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
      durationMs: result.durationMs,
      triggeredBy,
    },
  });

  return result;
}
