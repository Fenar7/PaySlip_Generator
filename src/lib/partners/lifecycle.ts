/**
 * Partner lifecycle state machine.
 *
 * Valid transitions:
 *   PENDING     → UNDER_REVIEW | REVOKED
 *   UNDER_REVIEW → APPROVED | REVOKED
 *   APPROVED     → SUSPENDED | REVOKED
 *   SUSPENDED    → APPROVED | REVOKED
 *   REVOKED      → (terminal — no further transitions)
 *
 * All transitions are platform-admin-only and must be recorded in
 * PartnerReviewEvent before the PartnerProfile status field is updated.
 */

import "server-only";
import { db } from "@/lib/db";
import { PartnerStatus } from "@/generated/prisma/client";

export type PartnerLifecycleAction =
  | "begin_review"
  | "approve"
  | "reject"
  | "suspend"
  | "reinstate"
  | "revoke";

interface TransitionDef {
  from: PartnerStatus[];
  to: PartnerStatus;
}

const TRANSITIONS: Record<PartnerLifecycleAction, TransitionDef> = {
  begin_review: { from: ["PENDING", "UNDER_REVIEW"], to: "UNDER_REVIEW" },
  approve:      { from: ["PENDING", "UNDER_REVIEW", "SUSPENDED"], to: "APPROVED" },
  reject:       { from: ["PENDING", "UNDER_REVIEW"], to: "REVOKED" },
  suspend:      { from: ["APPROVED"], to: "SUSPENDED" },
  reinstate:    { from: ["SUSPENDED"], to: "APPROVED" },
  revoke:       { from: ["PENDING", "UNDER_REVIEW", "APPROVED", "SUSPENDED"], to: "REVOKED" },
};

export function isValidTransition(
  current: PartnerStatus,
  action: PartnerLifecycleAction
): boolean {
  const def = TRANSITIONS[action];
  return def.from.includes(current);
}

export interface TransitionResult {
  success: true;
  newStatus: PartnerStatus;
}

export interface TransitionError {
  success: false;
  error: string;
}

/**
 * Execute a partner lifecycle transition atomically.
 * Records a PartnerReviewEvent and updates PartnerProfile in a transaction.
 * Throws on database failure — caller should catch and surface to admin.
 */
export async function executePartnerTransition(
  partnerId: string,
  actorUserId: string,
  action: PartnerLifecycleAction,
  notes?: string
): Promise<TransitionResult | TransitionError> {
  const def = TRANSITIONS[action];

  const profile = await db.partnerProfile.findUnique({
    where: { id: partnerId },
    select: { id: true, status: true },
  });

  if (!profile) {
    return { success: false, error: "Partner not found" };
  }

  if (!def.from.includes(profile.status)) {
    return {
      success: false,
      error: `Cannot ${action} a partner in status ${profile.status}. Allowed from: ${def.from.join(", ")}.`,
    };
  }

  const newStatus = def.to;
  const now = new Date();

  // Build lifecycle timestamp/reason fields based on action
  const lifecycleUpdate: Record<string, unknown> = {};
  if (action === "approve" || action === "reinstate") {
    lifecycleUpdate.reviewedByUserId = actorUserId;
    lifecycleUpdate.reviewedAt = now;
    lifecycleUpdate.reviewNotes = notes ?? null;
    lifecycleUpdate.suspendedAt = null;
    lifecycleUpdate.suspendedReason = null;
  } else if (action === "begin_review") {
    lifecycleUpdate.reviewedByUserId = actorUserId;
    lifecycleUpdate.reviewedAt = now;
    lifecycleUpdate.reviewNotes = notes ?? null;
  } else if (action === "suspend") {
    lifecycleUpdate.suspendedAt = now;
    lifecycleUpdate.suspendedReason = notes ?? null;
  } else if (action === "revoke" || action === "reject") {
    lifecycleUpdate.revokedAt = now;
    lifecycleUpdate.revokedReason = notes ?? null;
  }

  await db.$transaction([
    db.partnerReviewEvent.create({
      data: {
        partnerId,
        actorUserId,
        fromStatus: profile.status,
        toStatus: newStatus,
        notes: notes ?? null,
      },
    }),
    db.partnerProfile.update({
      where: { id: partnerId },
      data: {
        status: newStatus,
        ...(lifecycleUpdate as Parameters<typeof db.partnerProfile.update>[0]["data"]),
      },
    }),
  ]);

  return { success: true, newStatus };
}
