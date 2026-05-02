"use server";

import { db } from "@/lib/db";
import { requireRole, getOrgContext } from "@/lib/auth/require-org";
import { logAuditTx } from "@/lib/audit";
import { headers } from "next/headers";
import { rateLimitByOrg, RATE_LIMITS } from "@/lib/rate-limit";
import { validateFormat, extractCounterFromFormat } from "../engine/tokenizer";
import type {
  SequencePeriodicity,
  SequenceDocumentType,
  ResequencePreviewInput,
  ResequencePreviewResult,
  ResequenceApplyInput,
  ResequenceApplyResult,
} from "../types";
import type { OrgContext } from "@/lib/auth/require-org";
import { SequenceAdminError } from "./sequence-errors";

async function requireOrgOwner(): Promise<OrgContext> {
  return requireRole("owner");
}

function assertOrgMatch(ctx: OrgContext, targetOrgId: string): void {
  if (ctx.orgId !== targetOrgId) {
    throw new SequenceAdminError(
      `Cross-org access denied. Context org: ${ctx.orgId}, target org: ${targetOrgId}`
    );
  }
}

/**
 * Enforce that the authenticated caller is actively scoped to the requested org.
 * Used on read paths where any org member is allowed, but cross-org snooping is not.
 */
async function assertCallerOwnsOrg(targetOrgId: string): Promise<void> {
  const ctx = await getOrgContext();
  if (!ctx) {
    throw new SequenceAdminError("Authentication required");
  }
  if (ctx.orgId !== targetOrgId) {
    throw new SequenceAdminError(
      `Cross-org access denied. Context org: ${ctx.orgId}, target org: ${targetOrgId}`
    );
  }
}

function getSequenceAuditBase(ctx: OrgContext) {
  return {
    orgId: ctx.orgId,
    actorId: ctx.userId,
    entityType: "sequence",
  };
}

/**
 * Read request headers once before entering a transaction.
 * Pass the resulting values into logAuditTx so the audit row is
 * written inside the same atomic commit as the mutation.
 */
async function getAuditHeaders() {
  const hdrs = await headers();
  return {
    ipAddress: hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || null,
    userAgent: hdrs.get("user-agent") || null,
  };
}

/**
 * Get current sequence configuration for an org and document type.
 * No role check — readable by any org member — but caller must belong to the org.
 */
export async function getSequenceConfig(params: {
  orgId: string;
  documentType: SequenceDocumentType;
}) {
  await assertCallerOwnsOrg(params.orgId);

  const sequence = await db.sequence.findFirst({
    where: {
      organizationId: params.orgId,
      documentType: params.documentType,
    },
    include: {
      formats: { where: { isDefault: true }, take: 1 },
      periods: { orderBy: { startDate: "desc" }, take: 1 },
    },
  });

  if (!sequence) return null;

  const format = sequence.formats[0] ?? null;
  const period = sequence.periods[0] ?? null;

  return {
    sequenceId: sequence.id,
    name: sequence.name,
    documentType: sequence.documentType,
    periodicity: sequence.periodicity,
    isActive: sequence.isActive,
    formatString: format?.formatString ?? null,
    startCounter: format?.startCounter ?? null,
    counterPadding: format?.counterPadding ?? null,
    currentCounter: period?.currentCounter ?? null,
    periodId: period?.id ?? null,
    periodStart: period?.startDate ?? null,
    periodEnd: period?.endDate ?? null,
  };
}

/**
 * Update sequence format (owner-only).
 * Creates a new format version instead of editing in place,
 * preserving configuration history.
 *
 * The mutation and its audit record commit atomically.
 */
export async function updateSequenceFormat(params: {
  orgId: string;
  documentType: SequenceDocumentType;
  formatString: string;
  startCounter?: number;
  counterPadding?: number;
}) {
  const ctx = await requireOrgOwner();
  assertOrgMatch(ctx, params.orgId);

  const validation = validateFormat(params.formatString);
  if (!validation.valid) {
    throw new SequenceAdminError(
      `Invalid format string: ${validation.errors.join(", ")}`
    );
  }

  const sequence = await db.sequence.findFirst({
    where: {
      organizationId: params.orgId,
      documentType: params.documentType,
    },
    include: {
      formats: { where: { isDefault: true }, take: 1 },
    },
  });

  if (!sequence) {
    throw new SequenceAdminError(
      `No ${params.documentType} sequence found for org ${params.orgId}`
    );
  }

  const oldFormat = sequence.formats[0];
  const auditHeaders = await getAuditHeaders();

  await db.$transaction(async (tx) => {
    if (oldFormat) {
      await tx.sequenceFormat.update({
        where: { id: oldFormat.id },
        data: { isDefault: false },
      });
    }

    const created = await tx.sequenceFormat.create({
      data: {
        sequenceId: sequence.id,
        formatString: params.formatString,
        startCounter: params.startCounter ?? oldFormat?.startCounter ?? 1,
        counterPadding: params.counterPadding ?? oldFormat?.counterPadding ?? 5,
        isDefault: true,
      },
    });

    await logAuditTx(tx, {
      ...getSequenceAuditBase(ctx),
      entityId: sequence.id,
      action: "sequence.edited",
      metadata: {
        documentType: params.documentType,
        oldFormatId: oldFormat?.id ?? null,
        oldFormatString: oldFormat?.formatString ?? null,
        newFormatId: created.id,
        newFormatString: params.formatString,
        oldStartCounter: oldFormat?.startCounter ?? null,
        newStartCounter: created.startCounter,
      },
      ...auditHeaders,
    });
  });

  return { success: true };
}

/**
 * Update sequence periodicity (owner-only).
 *
 * The mutation and its audit record commit atomically.
 */
export async function updateSequencePeriodicity(params: {
  orgId: string;
  documentType: SequenceDocumentType;
  periodicity: SequencePeriodicity;
}) {
  const ctx = await requireOrgOwner();
  assertOrgMatch(ctx, params.orgId);

  const sequence = await db.sequence.findFirst({
    where: {
      organizationId: params.orgId,
      documentType: params.documentType,
    },
  });

  if (!sequence) {
    throw new SequenceAdminError(
      `No ${params.documentType} sequence found for org ${params.orgId}`
    );
  }

  const oldPeriodicity = sequence.periodicity;
  const auditHeaders = await getAuditHeaders();

  await db.$transaction(async (tx) => {
    await tx.sequence.update({
      where: { id: sequence.id },
      data: { periodicity: params.periodicity },
    });

    await logAuditTx(tx, {
      ...getSequenceAuditBase(ctx),
      entityId: sequence.id,
      action: "sequence.periodicity_changed",
      metadata: {
        documentType: params.documentType,
        oldPeriodicity,
        newPeriodicity: params.periodicity,
      },
      ...auditHeaders,
    });
  });

  return { success: true };
}

/**
 * Seed sequence continuity from a latest-used number (owner-only).
 *
 * Phase 1 invariant: currentCounter stores the LAST ISSUED number.
 * If latest used number extracts counter 42, currentCounter must become 42,
 * so that the next preview / next consume yields 43.
 *
 * The mutation and its audit record commit atomically.
 */
export async function seedSequenceContinuity(params: {
  orgId: string;
  documentType: SequenceDocumentType;
  latestUsedNumber: string;
}) {
  const ctx = await requireOrgOwner();
  assertOrgMatch(ctx, params.orgId);

  const sequence = await db.sequence.findFirst({
    where: {
      organizationId: params.orgId,
      documentType: params.documentType,
    },
    include: {
      formats: { where: { isDefault: true }, take: 1 },
      periods: { orderBy: { startDate: "desc" }, take: 1 },
    },
  });

  if (!sequence) {
    throw new SequenceAdminError(
      `No ${params.documentType} sequence found for org ${params.orgId}`
    );
  }

  const format = sequence.formats[0];
  if (!format) {
    throw new SequenceAdminError(
      `Sequence ${sequence.id} has no default format`
    );
  }

  // Validate that latestUsedNumber matches the format
  const extractedCounter = extractCounterFromFormat(
    params.latestUsedNumber,
    format.formatString
  );

  if (extractedCounter === null) {
    throw new SequenceAdminError(
      `Latest used number "${params.latestUsedNumber}" does not match format "${format.formatString}"`
    );
  }

  // Preserve Phase 1 invariant: currentCounter = last issued number
  const seededCounter = extractedCounter;
  const nextPreview = seededCounter + 1;

  const period = sequence.periods[0];
  const auditHeaders = await getAuditHeaders();

  await db.$transaction(async (tx) => {
    if (period) {
      await tx.sequencePeriod.update({
        where: { id: period.id },
        data: { currentCounter: seededCounter },
      });
    }

    await logAuditTx(tx, {
      ...getSequenceAuditBase(ctx),
      entityId: sequence.id,
      action: "sequence.continuity_seeded",
      metadata: {
        documentType: params.documentType,
        latestUsedNumber: params.latestUsedNumber,
        extractedCounter,
        seededCounter,
        nextPreview,
        periodId: period?.id ?? null,
      },
      ...auditHeaders,
    });
  });

  return { success: true, nextPreview };
}

/**
 * Atomically update format and periodicity as a single settings change.
 * Either both apply or both fail. Audit records for each sub-change
 * are written inside the same transaction.
 */
export async function updateSequenceSettingsAtomic(params: {
  orgId: string;
  documentType: SequenceDocumentType;
  formatString: string;
  periodicity: SequencePeriodicity;
}) {
  const ctx = await requireOrgOwner();
  assertOrgMatch(ctx, params.orgId);

  const validation = validateFormat(params.formatString);
  if (!validation.valid) {
    throw new SequenceAdminError(
      `Invalid format string: ${validation.errors.join(", ")}`
    );
  }

  const sequence = await db.sequence.findFirst({
    where: {
      organizationId: params.orgId,
      documentType: params.documentType,
    },
    include: {
      formats: { where: { isDefault: true }, take: 1 },
    },
  });

  if (!sequence) {
    throw new SequenceAdminError(
      `No ${params.documentType} sequence found for org ${params.orgId}`
    );
  }

  const oldFormat = sequence.formats[0];
  const oldPeriodicity = sequence.periodicity;
  const auditHeaders = await getAuditHeaders();

  await db.$transaction(async (tx) => {
    // 1. Format change: version the old default, create new default
    if (oldFormat) {
      await tx.sequenceFormat.update({
        where: { id: oldFormat.id },
        data: { isDefault: false },
      });
    }

    const newFormat = await tx.sequenceFormat.create({
      data: {
        sequenceId: sequence.id,
        formatString: params.formatString,
        startCounter: oldFormat?.startCounter ?? 1,
        counterPadding: oldFormat?.counterPadding ?? 5,
        isDefault: true,
      },
    });

    await logAuditTx(tx, {
      ...getSequenceAuditBase(ctx),
      entityId: sequence.id,
      action: "sequence.edited",
      metadata: {
        documentType: params.documentType,
        oldFormatId: oldFormat?.id ?? null,
        oldFormatString: oldFormat?.formatString ?? null,
        newFormatId: newFormat.id,
        newFormatString: params.formatString,
        oldStartCounter: oldFormat?.startCounter ?? null,
        newStartCounter: newFormat.startCounter,
      },
      ...auditHeaders,
    });

    // 2. Periodicity change
    await tx.sequence.update({
      where: { id: sequence.id },
      data: { periodicity: params.periodicity },
    });

    await logAuditTx(tx, {
      ...getSequenceAuditBase(ctx),
      entityId: sequence.id,
      action: "sequence.periodicity_changed",
      metadata: {
        documentType: params.documentType,
        oldPeriodicity,
        newPeriodicity: params.periodicity,
      },
      ...auditHeaders,
    });
  });

  return { success: true };
}

/**
 * Get audit history for sequence changes in an org.
 * When documentType is provided, filters to that specific sequence.
 * If the requested documentType has no sequence, returns empty —
 * never silently widen scope to all org events.
 */
export async function getSequenceAuditHistory(params: {
  orgId: string;
  documentType?: SequenceDocumentType;
  limit?: number;
  offset?: number;
}) {
  await assertCallerOwnsOrg(params.orgId);

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const actions = [
    "sequence.created",
    "sequence.edited",
    "sequence.periodicity_changed",
    "sequence.future_activated",
    "sequence.continuity_seeded",
    "sequence.resequence_previewed",
    "sequence.resequence_confirmed",
    "sequence.locked_attempt_blocked",
  ];

  if (params.documentType) {
    const sequence = await db.sequence.findFirst({
      where: {
        organizationId: params.orgId,
        documentType: params.documentType,
      },
      select: { id: true },
    });

    if (!sequence) {
      // Explicit empty result: filtered scope does not exist.
      return { logs: [], total: 0, limit, offset };
    }

    const where = {
      orgId: params.orgId,
      action: { in: actions },
      entityId: sequence.id,
    };

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          actor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: log.actor
          ? {
              id: log.actor.id,
              name: log.actor.fullName ?? log.actor.email,
            }
          : null,
        entityId: log.entityId,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
      total,
      limit,
      offset,
    };
  }

  // Unfiltered: return all sequence-related audit events for the org.
  const where = {
    orgId: params.orgId,
    action: { in: actions },
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      actor: log.actor
        ? {
            id: log.actor.id,
            name: log.actor.fullName ?? log.actor.email,
          }
        : null,
      entityId: log.entityId,
      metadata: log.metadata,
      createdAt: log.createdAt,
    })),
    total,
    limit,
    offset,
  };
}

/**
 * Preview resequencing for a document type within a date range (owner-only).
 *
 * Computes deterministic proposed numbering without mutating any live data.
 * No counters are consumed. No documents are updated.
 *
 * Phase 6 / Sprint 6.1: preview only. Sprint 6.2 will add the apply flow.
 */
export async function previewResequencePreview(
  input: ResequencePreviewInput
): Promise<ResequencePreviewResult> {
  const ctx = await requireOrgOwner();
  assertOrgMatch(ctx, input.orgId);

  // ResequencePreviewInput is validated by the caller (settings actions)
  // using ResequencePreviewInputSchema before reaching this function.

  const { previewResequence: preview } = await import("./sequence-resequence");
  return preview(input);
}

export async function applyResequencePreview(
  input: ResequenceApplyInput
): Promise<ResequenceApplyResult> {
  const ctx = await requireOrgOwner();
  assertOrgMatch(ctx, input.orgId);

  const rateLimit = await rateLimitByOrg(input.orgId, RATE_LIMITS.resequenceApply);
  if (!rateLimit.success) {
    throw new SequenceAdminError(
      `Rate limit exceeded for resequence apply. Retry after ${rateLimit.retryAfter ?? 60} seconds.`
    );
  }

  const auditHeaders = await getAuditHeaders();

  const { applyResequence: apply } = await import("./sequence-resequence");
  return apply(input, {
    actorId: ctx.userId,
    ipAddress: auditHeaders.ipAddress,
    userAgent: auditHeaders.userAgent,
  });
}
