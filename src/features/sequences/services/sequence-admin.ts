"use server";

import { db } from "@/lib/db";
// Prisma type available when transaction support is needed
import { requireRole } from "@/lib/auth/require-org";
import { logAudit } from "@/lib/audit";
import { tokenize, validateFormat } from "../engine/tokenizer";
import type { SequencePeriodicity, SequenceDocumentType } from "../types";

export class SequenceAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SequenceAdminError";
  }
}

async function requireOrgOwner() {
  return requireRole("owner");
}

function getSequenceAuditBase(ctx: { orgId: string; userId: string }) {
  return {
    orgId: ctx.orgId,
    actorId: ctx.userId,
    entityType: "sequence",
  };
}

/**
 * Get current sequence configuration for an org and document type.
 * No role check — readable by any org member.
 */
export async function getSequenceConfig(params: {
  orgId: string;
  documentType: SequenceDocumentType;
}) {
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
 */
export async function updateSequenceFormat(params: {
  orgId: string;
  documentType: SequenceDocumentType;
  formatString: string;
  startCounter?: number;
  counterPadding?: number;
}) {
  const ctx = await requireOrgOwner();

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

  await db.$transaction(async (tx) => {
    if (oldFormat) {
      await tx.sequenceFormat.update({
        where: { id: oldFormat.id },
        data: {
          formatString: params.formatString,
          startCounter: params.startCounter ?? oldFormat.startCounter,
          counterPadding: params.counterPadding ?? oldFormat.counterPadding,
        },
      });
    } else {
      await tx.sequenceFormat.create({
        data: {
          sequenceId: sequence.id,
          formatString: params.formatString,
          startCounter: params.startCounter ?? 1,
          counterPadding: params.counterPadding ?? 5,
          isDefault: true,
        },
      });
    }
  });

  await logAudit({
    ...getSequenceAuditBase(ctx),
    entityId: sequence.id,
    action: "sequence.edited",
    metadata: {
      documentType: params.documentType,
      oldFormatString: oldFormat?.formatString ?? null,
      newFormatString: params.formatString,
      oldStartCounter: oldFormat?.startCounter ?? null,
      newStartCounter: params.startCounter ?? oldFormat?.startCounter ?? null,
    },
  });

  return { success: true };
}

/**
 * Update sequence periodicity (owner-only).
 */
export async function updateSequencePeriodicity(params: {
  orgId: string;
  documentType: SequenceDocumentType;
  periodicity: SequencePeriodicity;
}) {
  const ctx = await requireOrgOwner();

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

  await db.sequence.update({
    where: { id: sequence.id },
    data: { periodicity: params.periodicity },
  });

  await logAudit({
    ...getSequenceAuditBase(ctx),
    entityId: sequence.id,
    action: "sequence.periodicity_changed",
    metadata: {
      documentType: params.documentType,
      oldPeriodicity,
      newPeriodicity: params.periodicity,
    },
  });

  return { success: true };
}

/**
 * Seed sequence continuity from a latest-used number (owner-only).
 */
export async function seedSequenceContinuity(params: {
  orgId: string;
  documentType: SequenceDocumentType;
  latestUsedNumber: string;
}) {
  const ctx = await requireOrgOwner();

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
  const extractedCounter = extractCounterFromNumber(
    params.latestUsedNumber,
    format.formatString
  );

  if (extractedCounter === null) {
    throw new SequenceAdminError(
      `Latest used number "${params.latestUsedNumber}" does not match format "${format.formatString}"`
    );
  }

  const nextCounter = extractedCounter + 1;

  const period = sequence.periods[0];
  if (period) {
    await db.sequencePeriod.update({
      where: { id: period.id },
      data: { currentCounter: nextCounter },
    });
  }

  await logAudit({
    ...getSequenceAuditBase(ctx),
    entityId: sequence.id,
    action: "sequence.continuity_seeded",
    metadata: {
      documentType: params.documentType,
      latestUsedNumber: params.latestUsedNumber,
      extractedCounter,
      nextCounter,
      periodId: period?.id ?? null,
    },
  });

  return { success: true, nextCounter };
}

/**
 * Get audit history for sequence changes in an org.
 */
export async function getSequenceAuditHistory(params: {
  orgId: string;
  documentType?: SequenceDocumentType;
  limit?: number;
  offset?: number;
}) {
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

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where: {
        orgId: params.orgId,
        action: { in: actions },
      },
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
    db.auditLog.count({
      where: {
        orgId: params.orgId,
        action: { in: actions },
      },
    }),
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
 * Extract the counter value from a formatted number by matching against the format string.
 */
function extractCounterFromNumber(
  formattedNumber: string,
  formatString: string
): number | null {
  // Tokenize the format string
  const tokens = tokenize(formatString);

  // Build a regex pattern from the format tokens
  let pattern = "^";
  let hasRunningNumber = false;

  for (const token of tokens) {
    if (token.type === "literal") {
      pattern += escapeRegex(token.value);
    } else if (token.type === "token" && token.value === "NNNNN") {
      pattern += "(\\d+)";
      hasRunningNumber = true;
    } else if (token.type === "token") {
      // For other tokens like YYYY, MM, DD, match digits or word chars
      if (token.value === "YYYY") {
        pattern += "(\\d{4})";
      } else if (token.value === "MM") {
        pattern += "(\\d{2})";
      } else if (token.value === "DD") {
        pattern += "(\\d{2})";
      } else if (token.value === "FY") {
        pattern += "FY[\\w\\-]+";
      } else if (token.value === "PREFIX") {
        pattern += "[A-Z0-9]+";
      } else {
        pattern += ".*?";
      }
    }
  }
  pattern += "$";

  if (!hasRunningNumber) return null;

  const regex = new RegExp(pattern);
  const match = formattedNumber.match(regex);

  if (!match) return null;

  // Find the capture group index for the running number
  let captureIndex = 1;
  for (const token of tokens) {
    if (token.type === "token" && token.value === "NNNNN") {
      break;
    }
    if (token.type === "token" && ["YYYY", "MM", "DD"].includes(token.value)) {
      captureIndex++;
    }
  }

  const counterStr = match[captureIndex];
  if (!counterStr) return null;

  const counter = parseInt(counterStr, 10);
  return isNaN(counter) ? null : counter;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
