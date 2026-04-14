import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createMarketplacePayoutEvent } from "./events";
import type { MarketplaceRevenuePayoutStatus } from "./constants";
import { isTerminalMarketplaceRevenueStatus } from "./constants";

const DEFAULT_SETTLEMENT_HOLD_DAYS = 7;

type DbLike = Prisma.TransactionClient | typeof db;

interface BeneficiarySnapshot {
  id: string;
  status: string;
}

interface RevenueEvaluationCandidate {
  id: string;
  publisherOrgId: string;
  status: string;
  createdAt: Date;
  queuedAt: Date | null;
  paidOutAt: Date | null;
  onHoldReason: string | null;
  failureReason: string | null;
  purchase: {
    status: string;
    createdAt: Date;
    template: {
      status: string;
    };
  };
}

export interface MarketplaceRevenueEvaluation {
  status: MarketplaceRevenuePayoutStatus;
  eligibleAt: Date | null;
  onHoldReason: string | null;
  failureReason: string | null;
}

function getSettlementHoldWindowDays(): number {
  const parsed = Number.parseInt(
    env.MARKETPLACE_PAYOUT_SETTLEMENT_HOLD_DAYS ?? "",
    10,
  );

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return DEFAULT_SETTLEMENT_HOLD_DAYS;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function evaluateMarketplaceRevenueStatus(
  candidate: RevenueEvaluationCandidate,
  beneficiary: BeneficiarySnapshot | null,
  now: Date = new Date(),
): MarketplaceRevenueEvaluation {
  if (candidate.status === "reversed") {
    return {
      status: "reversed",
      eligibleAt: null,
      onHoldReason: candidate.onHoldReason,
      failureReason: candidate.failureReason,
    };
  }

  if (candidate.paidOutAt || candidate.status === "paid") {
    return {
      status: "paid",
      eligibleAt: candidate.purchase.createdAt,
      onHoldReason: null,
      failureReason: null,
    };
  }

  if (candidate.onHoldReason?.startsWith("manual:")) {
    return {
      status: "on_hold",
      eligibleAt: null,
      onHoldReason: candidate.onHoldReason,
      failureReason: null,
    };
  }

  if (candidate.purchase.status !== "COMPLETED") {
    return {
      status: "pending",
      eligibleAt: null,
      onHoldReason: null,
      failureReason: null,
    };
  }

  if (candidate.purchase.template.status !== "PUBLISHED") {
    return {
      status: "on_hold",
      eligibleAt: null,
      onHoldReason: "template_not_payout_safe",
      failureReason: null,
    };
  }

  const eligibleAt = addDays(
    candidate.purchase.createdAt ?? candidate.createdAt,
    getSettlementHoldWindowDays(),
  );

  if (eligibleAt > now) {
    return {
      status: "pending",
      eligibleAt,
      onHoldReason: null,
      failureReason: null,
    };
  }

  if (!beneficiary) {
    return {
      status: "pending",
      eligibleAt,
      onHoldReason: null,
      failureReason: null,
    };
  }

  if (beneficiary.status === "suspended") {
    return {
      status: "on_hold",
      eligibleAt,
      onHoldReason: "beneficiary_suspended",
      failureReason: null,
    };
  }

  if (beneficiary.status !== "verified") {
    return {
      status: "pending",
      eligibleAt,
      onHoldReason: null,
      failureReason: null,
    };
  }

  return {
    status: "eligible",
    eligibleAt,
    onHoldReason: null,
    failureReason: null,
  };
}

async function persistRevenueEvaluation(
  client: DbLike,
  revenue: Pick<
    RevenueEvaluationCandidate,
    "id" | "publisherOrgId" | "status"
  > & {
    onHoldReason: string | null;
    failureReason: string | null;
  },
  evaluation: MarketplaceRevenueEvaluation,
  actorId?: string | null,
  reason?: string,
): Promise<void> {
  const shouldUpdate =
    revenue.status !== evaluation.status ||
    revenue.onHoldReason !== evaluation.onHoldReason ||
    revenue.failureReason !== evaluation.failureReason;

  if (!shouldUpdate) {
    await client.marketplaceRevenue.update({
      where: { id: revenue.id },
      data: {
        eligibleAt: evaluation.eligibleAt,
        lastEvaluatedAt: new Date(),
      },
    });
    return;
  }

  await client.marketplaceRevenue.update({
    where: { id: revenue.id },
    data: {
      status: evaluation.status,
      eligibleAt: evaluation.eligibleAt,
      onHoldReason: evaluation.onHoldReason,
      failureReason: evaluation.failureReason,
      lastEvaluatedAt: new Date(),
      ...(evaluation.status !== "queued_for_payout" ? { queuedAt: null } : {}),
    },
  });

  await createMarketplacePayoutEvent(client, {
    publisherOrgId: revenue.publisherOrgId,
    revenueId: revenue.id,
    actorId,
    eventType: "marketplace.payout_revenue.status_changed",
    fromStatus: revenue.status,
    toStatus: evaluation.status,
    reason,
    metadata: {
      onHoldReason: evaluation.onHoldReason,
      failureReason: evaluation.failureReason,
    },
  });
}

export async function refreshMarketplaceRevenueEligibilityForPublisherOrg(
  publisherOrgId: string,
  actorId?: string | null,
  reason?: string,
): Promise<void> {
  const now = new Date();

  await db.$transaction(async (tx) => {
    const beneficiary = await tx.marketplacePayoutBeneficiary.findUnique({
      where: { publisherOrgId },
      select: { id: true, status: true },
    });

    const revenues = await tx.marketplaceRevenue.findMany({
      where: {
        publisherOrgId,
        status: {
          notIn: ["paid", "reversed", "failed"],
        },
      },
      include: {
        purchase: {
          select: {
            status: true,
            createdAt: true,
            template: {
              select: { status: true },
            },
          },
        },
      },
    });

    for (const revenue of revenues) {
      const evaluation = evaluateMarketplaceRevenueStatus(
        revenue,
        beneficiary,
        now,
      );

      if (revenue.status === "queued_for_payout" && evaluation.status === "eligible") {
        await tx.marketplaceRevenue.update({
          where: { id: revenue.id },
          data: {
            eligibleAt: evaluation.eligibleAt,
            lastEvaluatedAt: now,
          },
        });
        continue;
      }

      await persistRevenueEvaluation(tx, revenue, evaluation, actorId, reason);
    }
  });
}

export async function holdMarketplaceRevenue(
  revenueId: string,
  actorId: string,
  reason: string,
): Promise<void> {
  const normalizedReason = reason.trim();
  if (!normalizedReason) {
    throw new Error("A hold reason is required.");
  }

  await db.$transaction(async (tx) => {
    const revenue = await tx.marketplaceRevenue.findUnique({
      where: { id: revenueId },
      select: {
        id: true,
        publisherOrgId: true,
        status: true,
      },
    });

    if (!revenue) {
      throw new Error("Marketplace revenue record not found.");
    }

    if (isTerminalMarketplaceRevenueStatus(revenue.status)) {
      throw new Error("Paid or reversed marketplace revenue cannot be held.");
    }

    await tx.marketplaceRevenue.update({
      where: { id: revenueId },
      data: {
        status: "on_hold",
        onHoldReason: `manual:${normalizedReason}`,
        lastEvaluatedAt: new Date(),
      },
    });

    await createMarketplacePayoutEvent(tx, {
      publisherOrgId: revenue.publisherOrgId,
      revenueId,
      actorId,
      eventType: "marketplace.payout_item.held",
      fromStatus: revenue.status,
      toStatus: "on_hold",
      reason: normalizedReason,
    });
  });
}

export async function releaseMarketplaceRevenueHold(
  revenueId: string,
  actorId: string,
): Promise<void> {
  const now = new Date();

  await db.$transaction(async (tx) => {
    const revenue = await tx.marketplaceRevenue.findUnique({
      where: { id: revenueId },
      include: {
        purchase: {
          select: {
            status: true,
            createdAt: true,
            template: {
              select: { status: true },
            },
          },
        },
      },
    });

    if (!revenue) {
      throw new Error("Marketplace revenue record not found.");
    }

    if (!revenue.onHoldReason?.startsWith("manual:")) {
      throw new Error("Only manually-held revenue can be released.");
    }

    const beneficiary = await tx.marketplacePayoutBeneficiary.findUnique({
      where: { publisherOrgId: revenue.publisherOrgId },
      select: { id: true, status: true },
    });

    const evaluation = evaluateMarketplaceRevenueStatus(revenue, beneficiary, now);

    await persistRevenueEvaluation(
      tx,
      revenue,
      evaluation,
      actorId,
      "manual_hold_released",
    );
  });
}
