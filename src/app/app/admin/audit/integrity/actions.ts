"use server";

import { requireRole } from "@/lib/auth";
import { requireFeature } from "@/lib/plans/enforcement";
import { db } from "@/lib/db";
import { runAndPersistVerification } from "@/lib/audit/chain-verifier";
import { generateAuditPackage } from "@/lib/audit/audit-package";
import { logAudit } from "@/lib/audit";
import type { ChainVerificationResult } from "@/lib/audit/chain-verifier";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface AuditIntegrityDashboardData {
  totalChainedEntries: number;
  totalUnchainedEntries: number;
  latestVerification: {
    status: string;
    verifiedAt: string;
    totalEntries: number;
    verifiedEntries: number;
    firstBreakSeq: number | null;
    firstBreakHash: string | null;
    durationMs: number;
    gapsDetected: number[];
    triggeredBy: string;
  } | null;
  recentExports: {
    id: string;
    dateRangeStart: string;
    dateRangeEnd: string;
    entryCount: number;
    status: string;
    createdAt: string;
  }[];
}

/**
 * Get the audit integrity dashboard data. Admin-only.
 */
export async function getAuditIntegrityData(): Promise<ActionResult<AuditIntegrityDashboardData>> {
  try {
    const { orgId } = await requireRole("admin");
    await requireFeature(orgId, "forensicAudit");

    const [chainedCount, unchainedCount, latestVerification, recentExports] =
      await Promise.all([
        db.auditLog.count({ where: { orgId, sequenceNum: { not: null } } }),
        db.auditLog.count({ where: { orgId, sequenceNum: null } }),
        db.auditChainVerification.findFirst({
          where: { orgId },
          orderBy: { verifiedAt: "desc" },
        }),
        db.auditPackageExport.findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    return {
      success: true,
      data: {
        totalChainedEntries: chainedCount,
        totalUnchainedEntries: unchainedCount,
        latestVerification: latestVerification
          ? {
              status: latestVerification.status,
              verifiedAt: latestVerification.verifiedAt.toISOString(),
              totalEntries: latestVerification.totalEntries,
              verifiedEntries: latestVerification.verifiedEntries,
              firstBreakSeq: latestVerification.firstBreakSeq
                ? Number(latestVerification.firstBreakSeq)
                : null,
              firstBreakHash: latestVerification.firstBreakHash,
              durationMs: latestVerification.durationMs,
              gapsDetected: (latestVerification.gapsDetected as number[]) ?? [],
              triggeredBy: latestVerification.triggeredBy,
            }
          : null,
        recentExports: recentExports.map((e) => ({
          id: e.id,
          dateRangeStart: e.dateRangeStart.toISOString(),
          dateRangeEnd: e.dateRangeEnd.toISOString(),
          entryCount: e.entryCount,
          status: e.status,
          createdAt: e.createdAt.toISOString(),
        })),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load audit data" };
  }
}

/**
 * Trigger on-demand chain verification. Admin-only.
 */
export async function verifyChainAction(): Promise<ActionResult<ChainVerificationResult>> {
  try {
    const { orgId, userId } = await requireRole("admin");
    await requireFeature(orgId, "forensicAudit");

    const result = await runAndPersistVerification(orgId, userId);
    await logAudit({
      orgId,
      actorId: userId,
      action: "audit.chain_verified",
      entityType: "AuditChainVerification",
      metadata: {
        status: result.status,
        totalEntries: result.totalEntries,
        verified: result.verified,
        firstBreakAt: result.firstBreakAt ?? null,
        gapsDetected: result.gapsDetected,
      },
    });
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Verification failed" };
  }
}

/**
 * Generate and return an audit package ZIP. Owner-only (regulatory export).
 */
export async function exportAuditPackageAction(
  dateRangeStart: string,
  dateRangeEnd: string,
): Promise<ActionResult<{ exportId: string; entryCount: number; chainIntact: boolean; base64Zip: string }>> {
  try {
    const { orgId, userId } = await requireRole("owner");
    await requireFeature(orgId, "forensicAudit");

    const result = await generateAuditPackage(
      orgId,
      new Date(dateRangeStart),
      new Date(dateRangeEnd),
      userId,
    );

    await logAudit({
      orgId,
      actorId: userId,
      action: "audit_package.exported",
      entityType: "AuditPackageExport",
      entityId: result.exportId,
      metadata: {
        dateRangeStart,
        dateRangeEnd,
        entryCount: result.entryCount,
        chainIntact: result.chainIntact,
      },
    });

    return {
      success: true,
      data: {
        exportId: result.exportId,
        entryCount: result.entryCount,
        chainIntact: result.chainIntact,
        base64Zip: result.zipBuffer.toString("base64"),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Export failed" };
  }
}
