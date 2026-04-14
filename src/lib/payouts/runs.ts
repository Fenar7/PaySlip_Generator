import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { generateCSV } from "@/lib/csv";
import { canManuallyResolveMarketplacePayoutItem } from "./constants";
import { getMarketplacePayoutProvider } from "./provider-adapter";
import { createMarketplacePayoutEvent } from "./events";
import { evaluateMarketplaceRevenueStatus } from "./eligibility";
import { getMarketplacePayoutBeneficiarySummary } from "./beneficiary";

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === "number" ? value : Number(value);
}

function buildMarketplacePayoutRunNumber(): string {
  const now = new Date();
  const datePart = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `MPR-${datePart}-${suffix}`;
}

function buildAttemptIdempotencyKey(
  payoutItemId: string,
  attemptNumber: number,
): string {
  return crypto
    .createHash("sha256")
    .update(`${payoutItemId}:${attemptNumber}`)
    .digest("hex");
}

function buildManualResolutionIdempotencyKey(
  payoutItemId: string,
  resolutionKind: "paid" | "failed",
): string {
  return `manual-resolution:${resolutionKind}:${payoutItemId}`;
}

function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function logRunAuditEntries(
  client: Prisma.TransactionClient,
  runId: string,
  actorId: string,
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const orgIds = await client.marketplacePayoutItem.findMany({
    where: { payoutRunId: runId },
    select: { publisherOrgId: true },
    distinct: ["publisherOrgId"],
  });

  for (const row of orgIds) {
    await client.auditLog.create({
      data: {
        orgId: row.publisherOrgId,
        actorId,
        action,
        entityType: "marketplace_payout_run",
        entityId: runId,
        ...(metadata
          ? { metadata: metadata as Prisma.InputJsonValue }
          : {}),
      },
    });
  }
}

async function syncMarketplacePayoutRun(
  client: Prisma.TransactionClient,
  payoutRunId: string,
): Promise<void> {
  const run = await client.marketplacePayoutRun.findUnique({
    where: { id: payoutRunId },
    select: {
      status: true,
      itemCount: true,
      items: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!run) {
    throw new Error("Marketplace payout run not found.");
  }

  const successCount = run.items.filter((item) => item.status === "paid").length;
  const failureCount = run.items.filter((item) => item.status === "failed").length;
  const manualReviewCount = run.items.filter(
    (item) => item.status === "manual_review",
  ).length;
  const processingCount = run.items.filter(
    (item) => item.status === "processing",
  ).length;

  let status = run.status;
  if (["approved", "processing", "failed", "completed"].includes(run.status)) {
    if (processingCount > 0 || manualReviewCount > 0) {
      status = "processing";
    } else if (successCount === run.items.length && run.items.length > 0) {
      status = "completed";
    } else if (failureCount > 0) {
      status = "failed";
    }
  }

  await client.marketplacePayoutRun.update({
    where: { id: payoutRunId },
    data: {
      status,
      successCount,
      failureCount,
      manualReviewCount,
      ...(status === "completed" ? { completedAt: new Date(), failedAt: null } : {}),
      ...(status === "failed" ? { failedAt: new Date() } : {}),
    },
  });
}

export interface MarketplacePayoutRunListEntry {
  id: string;
  runNumber: string;
  status: string;
  providerName: string;
  totalAmount: number;
  itemCount: number;
  successCount: number;
  failureCount: number;
  manualReviewCount: number;
  createdAt: string;
  approvedAt: string | null;
  executedAt: string | null;
}

export interface MarketplacePayoutRunDetailItem {
  id: string;
  publisherOrgId: string;
  publisherOrgName: string;
  templateId: string;
  templateName: string;
  amount: number;
  revenueStatus: string;
  status: string;
  beneficiaryStatus: string;
  attemptCount: number;
  externalReferenceId: string | null;
  providerReferenceId: string | null;
  failureMessage: string | null;
  manualReviewReason: string | null;
  settledAt: string | null;
}

export interface MarketplacePayoutRunDetail {
  id: string;
  runNumber: string;
  status: string;
  providerName: string;
  totalAmount: number;
  itemCount: number;
  successCount: number;
  failureCount: number;
  manualReviewCount: number;
  notes: string | null;
  createdAt: string;
  approvedAt: string | null;
  executedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  items: MarketplacePayoutRunDetailItem[];
}

export interface PublisherPayoutSummary {
  totalEarned: number;
  amountPending: number;
  amountOnHold: number;
  amountPaid: number;
  amountFailed: number;
  lastPaidAt: string | null;
  beneficiary: Awaited<
    ReturnType<typeof getMarketplacePayoutBeneficiarySummary>
  >;
}

export interface PublisherPayoutHistoryEntry {
  payoutItemId: string;
  payoutRunId: string;
  payoutRunNumber: string;
  templateName: string;
  amount: number;
  status: string;
  createdAt: string;
  settledAt: string | null;
  externalReferenceId: string | null;
  failureMessage: string | null;
}

export async function buildMarketplacePayoutRun(input: {
  actorId: string;
  publisherOrgIds?: string[];
  minimumAmount?: number;
  notes?: string;
}): Promise<MarketplacePayoutRunDetail> {
  const provider = getMarketplacePayoutProvider();
  const now = new Date();

  return db.$transaction(async (tx) => {
    const revenues = await tx.marketplaceRevenue.findMany({
      where: {
        ...(input.publisherOrgIds?.length
          ? { publisherOrgId: { in: input.publisherOrgIds } }
          : {}),
        status: {
          notIn: ["paid", "reversed", "queued_for_payout", "failed"],
        },
        payoutItems: {
          none: {},
        },
      },
      include: {
        purchase: {
          select: {
            status: true,
            createdAt: true,
            template: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
        publisherOrg: {
          select: {
            id: true,
            name: true,
            marketplacePayoutBeneficiary: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (revenues.length === 0) {
      throw new Error("No marketplace revenue is available for payout.");
    }

    const revenueIds = revenues.map((revenue) => revenue.id);
    const openItems = await tx.marketplacePayoutItem.findMany({
      where: {
        revenueId: { in: revenueIds },
        status: { in: ["pending", "processing", "manual_review"] },
      },
      select: { revenueId: true },
    });
    const openRevenueIds = new Set(openItems.map((item) => item.revenueId));

    const candidateRevenues: typeof revenues = [];

    for (const revenue of revenues) {
      const evaluation = evaluateMarketplaceRevenueStatus(
        revenue,
        revenue.publisherOrg.marketplacePayoutBeneficiary,
        now,
      );

      const shouldUpdate =
        revenue.status !== evaluation.status ||
        revenue.onHoldReason !== evaluation.onHoldReason ||
        revenue.failureReason !== evaluation.failureReason;

      if (shouldUpdate) {
        await tx.marketplaceRevenue.update({
          where: { id: revenue.id },
          data: {
            status: evaluation.status,
            eligibleAt: evaluation.eligibleAt,
            onHoldReason: evaluation.onHoldReason,
            failureReason: evaluation.failureReason,
            lastEvaluatedAt: now,
          },
        });

        await createMarketplacePayoutEvent(tx, {
          publisherOrgId: revenue.publisherOrgId,
          revenueId: revenue.id,
          actorId: input.actorId,
          eventType: "marketplace.payout_revenue.status_changed",
          fromStatus: revenue.status,
          toStatus: evaluation.status,
          reason: "run_build_refresh",
        });
      }

      if (
        evaluation.status === "eligible" &&
        !openRevenueIds.has(revenue.id) &&
        toNumber(revenue.publisherShare) >= (input.minimumAmount ?? 0) &&
        revenue.publisherOrg.marketplacePayoutBeneficiary
      ) {
        candidateRevenues.push(revenue);
      }
    }

    if (candidateRevenues.length === 0) {
      throw new Error("No payout-eligible marketplace revenue is available right now.");
    }

    const claimedRevenues: typeof candidateRevenues = [];

    for (const revenue of candidateRevenues) {
      const claimResult = await tx.marketplaceRevenue.updateMany({
        where: {
          id: revenue.id,
          status: "eligible",
        },
        data: {
          status: "queued_for_payout",
          queuedAt: now,
          onHoldReason: null,
          failureReason: null,
          lastEvaluatedAt: now,
        },
      });

      if (claimResult.count === 1) {
        claimedRevenues.push(revenue);
      }
    }

    if (claimedRevenues.length === 0) {
      throw new Error(
        "No payout-eligible marketplace revenue is available right now. Another payout run may have already claimed the available items.",
      );
    }

    const runNumber = buildMarketplacePayoutRunNumber();
    const totalAmount = claimedRevenues.reduce(
      (sum, revenue) => sum + toNumber(revenue.publisherShare),
      0,
    );

    const run = await tx.marketplacePayoutRun.create({
      data: {
        runNumber,
        providerName: provider.name,
        status: "draft",
        totalAmount,
        itemCount: claimedRevenues.length,
        notes: normalizeOptionalText(input.notes),
        requestedByUserId: input.actorId,
        items: {
          create: claimedRevenues.map((revenue) => ({
            revenueId: revenue.id,
            publisherOrgId: revenue.publisherOrgId,
            beneficiaryId: revenue.publisherOrg.marketplacePayoutBeneficiary!.id,
            amount: revenue.publisherShare,
            status: "pending",
          })),
        },
      },
    });

    for (const revenue of claimedRevenues) {
      await createMarketplacePayoutEvent(tx, {
        publisherOrgId: revenue.publisherOrgId,
        payoutRunId: run.id,
        revenueId: revenue.id,
        actorId: input.actorId,
        eventType: "marketplace.payout_revenue.queued",
        fromStatus: "eligible",
        toStatus: "queued_for_payout",
        metadata: {
          runNumber,
          templateName: revenue.purchase.template.name,
        },
      });
    }

    await createMarketplacePayoutEvent(tx, {
      payoutRunId: run.id,
      actorId: input.actorId,
      eventType: "marketplace.payout_run.created",
      toStatus: "draft",
      metadata: {
        runNumber,
        itemCount: claimedRevenues.length,
        totalAmount,
      },
    });

    await logRunAuditEntries(tx, run.id, input.actorId, "marketplace.payout_run.created", {
      runNumber,
      itemCount: claimedRevenues.length,
      totalAmount,
    });

    return getMarketplacePayoutRunInternal(tx, run.id);
  });
}

export async function approveMarketplacePayoutRun(input: {
  payoutRunId: string;
  actorId: string;
}): Promise<MarketplacePayoutRunDetail> {
  return db.$transaction(async (tx) => {
    const run = await tx.marketplacePayoutRun.findUnique({
      where: { id: input.payoutRunId },
      select: {
        id: true,
        runNumber: true,
        status: true,
        itemCount: true,
      },
    });

    if (!run) {
      throw new Error("Marketplace payout run not found.");
    }

    if (run.itemCount === 0) {
      throw new Error("Payout runs without items cannot be approved.");
    }

    if (run.status !== "draft") {
      throw new Error("Only draft payout runs can be approved.");
    }

    await tx.marketplacePayoutRun.update({
      where: { id: input.payoutRunId },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedByUserId: input.actorId,
      },
    });

    await createMarketplacePayoutEvent(tx, {
      payoutRunId: input.payoutRunId,
      actorId: input.actorId,
      eventType: "marketplace.payout_run.approved",
      fromStatus: run.status,
      toStatus: "approved",
      metadata: {
        runNumber: run.runNumber,
      },
    });

    await logRunAuditEntries(
      tx,
      input.payoutRunId,
      input.actorId,
      "marketplace.payout_run.approved",
      { runNumber: run.runNumber },
    );

    return getMarketplacePayoutRunInternal(tx, input.payoutRunId);
  });
}

export async function executeMarketplacePayoutRun(input: {
  payoutRunId: string;
  actorId: string;
}): Promise<MarketplacePayoutRunDetail> {
  const provider = getMarketplacePayoutProvider();
  const preparedResult = await db.$transaction(async (tx) => {
    const run = await tx.marketplacePayoutRun.findUnique({
      where: { id: input.payoutRunId },
      select: {
        id: true,
        runNumber: true,
        status: true,
        executedAt: true,
      },
    });

    if (!run) {
      throw new Error("Marketplace payout run not found.");
    }

    if (run.status !== "approved" && run.status !== "failed") {
      throw new Error("Only approved or failed payout runs can be executed.");
    }

    const claimedRun = await tx.marketplacePayoutRun.updateMany({
      where: {
        id: run.id,
        status: { in: ["approved", "failed"] },
      },
      data: {
        status: "processing",
        executedAt: run.executedAt ?? new Date(),
        executedByUserId: input.actorId,
        completedAt: null,
        failedAt: null,
      },
    });

    if (claimedRun.count !== 1) {
      throw new Error("This payout run is already being processed.");
    }

    const items = await tx.marketplacePayoutItem.findMany({
      where: {
        payoutRunId: run.id,
        status: { in: ["pending", "failed"] },
      },
      include: {
        beneficiary: {
          select: {
            id: true,
            status: true,
            payoutMethod: true,
            accountHolderName: true,
            bankAccountLast4: true,
            providerBeneficiaryId: true,
          },
        },
        revenue: {
          select: {
            id: true,
            publisherOrgId: true,
            status: true,
            createdAt: true,
            queuedAt: true,
            paidOutAt: true,
            onHoldReason: true,
            failureReason: true,
            purchase: {
              select: {
                status: true,
                createdAt: true,
                template: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (items.length === 0) {
      await syncMarketplacePayoutRun(tx, run.id);
      throw new Error("This payout run has no pending items to execute.");
    }

    await createMarketplacePayoutEvent(tx, {
      payoutRunId: run.id,
      actorId: input.actorId,
      eventType: "marketplace.payout_run.executed",
      fromStatus: run.status,
      toStatus: "processing",
      metadata: {
        runNumber: run.runNumber,
        itemCount: items.length,
      },
    });

    await logRunAuditEntries(
      tx,
      run.id,
      input.actorId,
      "marketplace.payout_run.executed",
      { runNumber: run.runNumber, itemCount: items.length },
    );

    const prepared = [];
    const now = new Date();

    for (const item of items) {
      const evaluation = evaluateMarketplaceRevenueStatus(
        item.revenue,
        {
          id: item.beneficiary.id,
          status: item.beneficiary.status,
        },
        now,
      );

      if (
        item.beneficiary.status !== "verified" ||
        item.revenue.status !== "queued_for_payout"
      ) {
        const failureCode = "payout_revalidation_required";
        const failureMessage =
          item.beneficiary.status !== "verified"
            ? "Beneficiary details must be re-verified before this payout can be executed. Refresh and rebuild the payout run after verification."
            : "This revenue is no longer payout-eligible. Refresh and rebuild the payout run before executing it.";

        if (
          item.revenue.status === "queued_for_payout" &&
          evaluation.status !== "eligible"
        ) {
          await tx.marketplaceRevenue.update({
            where: { id: item.revenue.id },
            data: {
              status: evaluation.status,
              eligibleAt: evaluation.eligibleAt,
              onHoldReason: evaluation.onHoldReason,
              failureReason: evaluation.failureReason,
              queuedAt: null,
              lastEvaluatedAt: now,
            },
          });

          await createMarketplacePayoutEvent(tx, {
            publisherOrgId: item.publisherOrgId,
            revenueId: item.revenue.id,
            actorId: input.actorId,
            eventType: "marketplace.payout_revenue.status_changed",
            fromStatus: item.revenue.status,
            toStatus: evaluation.status,
            reason: "execution_revalidation",
            metadata: {
              onHoldReason: evaluation.onHoldReason,
              failureReason: evaluation.failureReason,
            },
          });
        }

        await tx.marketplacePayoutItem.update({
          where: { id: item.id },
          data: {
            status: "failed",
            failureCode,
            failureMessage,
            manualReviewReason: null,
          },
        });

        await createMarketplacePayoutEvent(tx, {
          publisherOrgId: item.publisherOrgId,
          payoutRunId: run.id,
          payoutItemId: item.id,
          revenueId: item.revenue.id,
          actorId: input.actorId,
          eventType: "marketplace.payout_item.failed",
          fromStatus: item.status,
          toStatus: "failed",
          reason: failureMessage,
          metadata: {
            failureCode,
            revenueStatus: evaluation.status,
            beneficiaryStatus: item.beneficiary.status,
          },
        });

        await tx.auditLog.create({
          data: {
            orgId: item.publisherOrgId,
            actorId: input.actorId,
            action: "marketplace.payout_item.failed",
            entityType: "marketplace_payout_item",
            entityId: item.id,
            metadata: {
              payoutRunId: run.id,
              failureCode,
              failureMessage,
              revenueStatus: evaluation.status,
              beneficiaryStatus: item.beneficiary.status,
            },
          },
        });

        continue;
      }

      const attemptNumber = item.attemptCount + 1;
      const idempotencyKey = buildAttemptIdempotencyKey(item.id, attemptNumber);
      const attempt = await tx.marketplacePayoutAttempt.create({
        data: {
          payoutRunId: run.id,
          payoutItemId: item.id,
          providerName: provider.name,
          status: "pending",
          idempotencyKey,
          requestPayload: {
            payoutRunId: run.id,
            payoutItemId: item.id,
            amount: Number(item.amount),
            beneficiaryId: item.beneficiary.id,
            payoutMethod: item.beneficiary.payoutMethod,
            bankAccountLast4: item.beneficiary.bankAccountLast4,
          },
        },
      });

      await tx.marketplacePayoutItem.update({
        where: { id: item.id },
        data: {
          status: "processing",
          attemptCount: attemptNumber,
          lastAttemptAt: new Date(),
          failureCode: null,
          failureMessage: null,
          manualReviewReason: null,
        },
      });

      prepared.push({
        payoutRunId: run.id,
        payoutItemId: item.id,
        payoutAttemptId: attempt.id,
        idempotencyKey,
        amount: Number(item.amount),
        beneficiary: item.beneficiary,
      });
    }

    await syncMarketplacePayoutRun(tx, run.id);

    return {
      prepared,
      blockedAll: prepared.length === 0,
    };
  });

  if (preparedResult.blockedAll) {
    throw new Error(
      "This payout run no longer has any executable items. Refresh beneficiary eligibility and rebuild the run before trying again.",
    );
  }

  for (const item of preparedResult.prepared) {
    const result = await provider.dispatchPayout({
      payoutRunId: item.payoutRunId,
      payoutItemId: item.payoutItemId,
      payoutAttemptId: item.payoutAttemptId,
      idempotencyKey: item.idempotencyKey,
      amount: item.amount,
      currency: "INR",
      beneficiary: item.beneficiary,
    });

    await db.$transaction(async (tx) => {
      const payoutItem = await tx.marketplacePayoutItem.findUnique({
        where: { id: item.payoutItemId },
        include: {
          revenue: {
            select: {
              id: true,
              publisherOrgId: true,
              status: true,
            },
          },
        },
      });

      if (!payoutItem) {
        throw new Error("Marketplace payout item not found.");
      }

      if (result.outcome === "success") {
        await tx.marketplacePayoutAttempt.update({
          where: { id: item.payoutAttemptId },
          data: {
            status: "success",
            providerRequestId: result.providerRequestId ?? null,
            providerReferenceId: result.providerReferenceId ?? null,
            ...(result.responsePayload
              ? { responsePayload: result.responsePayload as Prisma.InputJsonValue }
              : {}),
            processedAt: new Date(),
          },
        });

        await tx.marketplacePayoutItem.update({
          where: { id: payoutItem.id },
          data: {
            status: "paid",
            providerReferenceId: result.providerReferenceId ?? null,
            settledAt: new Date(),
          },
        });

        await tx.marketplaceRevenue.update({
          where: { id: payoutItem.revenueId },
          data: {
            status: "paid",
            paidOutAt: new Date(),
            failureReason: null,
            onHoldReason: null,
          },
        });

        await createMarketplacePayoutEvent(tx, {
          publisherOrgId: payoutItem.publisherOrgId,
          payoutRunId: payoutItem.payoutRunId,
          payoutItemId: payoutItem.id,
          payoutAttemptId: item.payoutAttemptId,
          revenueId: payoutItem.revenueId,
          actorId: input.actorId,
          eventType: "marketplace.payout_item.paid",
          fromStatus: payoutItem.revenue.status,
          toStatus: "paid",
        });

        await tx.auditLog.create({
          data: {
            orgId: payoutItem.publisherOrgId,
            actorId: input.actorId,
            action: "marketplace.payout_item.paid",
            entityType: "marketplace_payout_item",
            entityId: payoutItem.id,
            metadata: {
              payoutRunId: payoutItem.payoutRunId,
              providerReferenceId: result.providerReferenceId ?? null,
            },
          },
        });
      }

      if (result.outcome === "manual_review") {
        await tx.marketplacePayoutAttempt.update({
          where: { id: item.payoutAttemptId },
          data: {
            status: "manual_review",
            providerRequestId: result.providerRequestId ?? null,
            failureCode: result.failureCode,
            failureMessage: result.failureMessage,
            ...(result.responsePayload
              ? { responsePayload: result.responsePayload as Prisma.InputJsonValue }
              : {}),
            processedAt: new Date(),
          },
        });

        await tx.marketplacePayoutItem.update({
          where: { id: payoutItem.id },
          data: {
            status: "manual_review",
            failureCode: result.failureCode,
            failureMessage: result.failureMessage,
            manualReviewReason: result.failureMessage,
          },
        });

        await createMarketplacePayoutEvent(tx, {
          publisherOrgId: payoutItem.publisherOrgId,
          payoutRunId: payoutItem.payoutRunId,
          payoutItemId: payoutItem.id,
          payoutAttemptId: item.payoutAttemptId,
          revenueId: payoutItem.revenueId,
          actorId: input.actorId,
          eventType: "marketplace.payout_item.manual_review",
          fromStatus: payoutItem.status,
          toStatus: "manual_review",
          reason: result.failureMessage,
        });
      }

      if (result.outcome === "failed") {
        await tx.marketplacePayoutAttempt.update({
          where: { id: item.payoutAttemptId },
          data: {
            status: "failed",
            providerRequestId: result.providerRequestId ?? null,
            failureCode: result.failureCode,
            failureMessage: result.failureMessage,
            ...(result.responsePayload
              ? { responsePayload: result.responsePayload as Prisma.InputJsonValue }
              : {}),
            processedAt: new Date(),
            retryable: result.retryable,
          },
        });

        await tx.marketplacePayoutItem.update({
          where: { id: payoutItem.id },
          data: {
            status: "failed",
            failureCode: result.failureCode,
            failureMessage: result.failureMessage,
          },
        });

        await tx.marketplaceRevenue.update({
          where: { id: payoutItem.revenueId },
          data: {
            status: "failed",
            failureReason: result.failureMessage,
          },
        });

        await createMarketplacePayoutEvent(tx, {
          publisherOrgId: payoutItem.publisherOrgId,
          payoutRunId: payoutItem.payoutRunId,
          payoutItemId: payoutItem.id,
          payoutAttemptId: item.payoutAttemptId,
          revenueId: payoutItem.revenueId,
          actorId: input.actorId,
          eventType: "marketplace.payout_item.failed",
          fromStatus: payoutItem.revenue.status,
          toStatus: "failed",
          reason: result.failureMessage,
        });

        await tx.auditLog.create({
          data: {
            orgId: payoutItem.publisherOrgId,
            actorId: input.actorId,
            action: "marketplace.payout_item.failed",
            entityType: "marketplace_payout_item",
            entityId: payoutItem.id,
            metadata: {
              payoutRunId: payoutItem.payoutRunId,
              failureCode: result.failureCode,
              failureMessage: result.failureMessage,
            },
          },
        });
      }

      await syncMarketplacePayoutRun(tx, payoutItem.payoutRunId);
    });
  }

  return getMarketplacePayoutRun(input.payoutRunId);
}

async function ensureResolutionAttempt(
  client: Prisma.TransactionClient,
  payoutItemId: string,
  payoutRunId: string,
  resolutionKind: "paid" | "failed",
): Promise<string> {
  const attempt = await client.marketplacePayoutAttempt.upsert({
    where: {
      idempotencyKey: buildManualResolutionIdempotencyKey(
        payoutItemId,
        resolutionKind,
      ),
    },
    update: {},
    create: {
      payoutRunId,
      payoutItemId,
      providerName: "manual",
      status: "pending",
      idempotencyKey: buildManualResolutionIdempotencyKey(
        payoutItemId,
        resolutionKind,
      ),
      requestPayload: {
        reason: `manual_${resolutionKind}_resolution`,
      },
    },
    select: { id: true },
  });

  return attempt.id;
}

export async function recordMarketplacePayoutItemPaid(input: {
  payoutRunId: string;
  payoutItemId: string;
  actorId: string;
  externalReferenceId: string;
  providerReferenceId?: string;
  note?: string;
}): Promise<MarketplacePayoutRunDetail> {
  const externalReferenceId = input.externalReferenceId.trim();
  if (!externalReferenceId) {
    throw new Error("An external payout reference is required.");
  }

  await db.$transaction(async (tx) => {
    const payoutItem = await tx.marketplacePayoutItem.findUnique({
      where: { id: input.payoutItemId },
      include: {
        revenue: {
          select: {
            id: true,
            publisherOrgId: true,
            status: true,
          },
        },
        payoutRun: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!payoutItem || payoutItem.payoutRunId !== input.payoutRunId) {
      throw new Error("Marketplace payout item not found.");
    }

    if (payoutItem.status === "paid") {
      throw new Error("This payout item is already marked paid.");
    }

    if (payoutItem.payoutRun.status === "cancelled") {
      throw new Error("Cancelled payout runs cannot be updated.");
    }

    if (
      !canManuallyResolveMarketplacePayoutItem(
        payoutItem.payoutRun.status,
        payoutItem.status,
      )
    ) {
      throw new Error(
        "Manual paid resolution is only allowed for failed or manual-review payout items after execution has started.",
      );
    }

    const claim = await tx.marketplacePayoutItem.updateMany({
      where: {
        id: payoutItem.id,
        status: payoutItem.status,
      },
      data: {
        status: "processing",
        lastAttemptAt: new Date(),
      },
    });

    if (claim.count !== 1) {
      throw new Error("This payout item is already being updated.");
    }

    const attemptId = await ensureResolutionAttempt(
      tx,
      payoutItem.id,
      payoutItem.payoutRunId,
      "paid",
    );

    await tx.marketplacePayoutAttempt.update({
      where: { id: attemptId },
      data: {
        status: "success",
        providerReferenceId: normalizeOptionalText(input.providerReferenceId),
        failureCode: null,
        failureMessage: null,
        responsePayload: {
          note: normalizeOptionalText(input.note),
          externalReferenceId,
        },
        processedAt: new Date(),
      },
    });

    await tx.marketplacePayoutItem.update({
      where: { id: payoutItem.id },
      data: {
        status: "paid",
        externalReferenceId,
        providerReferenceId: normalizeOptionalText(input.providerReferenceId),
        failureCode: null,
        failureMessage: null,
        manualReviewReason: null,
        settledAt: new Date(),
      },
    });

    await tx.marketplaceRevenue.update({
      where: { id: payoutItem.revenueId },
      data: {
        status: "paid",
        paidOutAt: new Date(),
        failureReason: null,
        onHoldReason: null,
      },
    });

    await createMarketplacePayoutEvent(tx, {
      publisherOrgId: payoutItem.publisherOrgId,
      payoutRunId: payoutItem.payoutRunId,
      payoutItemId: payoutItem.id,
      payoutAttemptId: attemptId,
      revenueId: payoutItem.revenueId,
      actorId: input.actorId,
      eventType: "marketplace.payout_item.paid",
      fromStatus: payoutItem.revenue.status,
      toStatus: "paid",
      metadata: {
        externalReferenceId,
        note: normalizeOptionalText(input.note),
      },
    });

    await tx.auditLog.create({
      data: {
        orgId: payoutItem.publisherOrgId,
        actorId: input.actorId,
        action: "marketplace.payout_item.paid",
        entityType: "marketplace_payout_item",
        entityId: payoutItem.id,
        metadata: {
          payoutRunId: payoutItem.payoutRunId,
          externalReferenceId,
        },
      },
    });

    await syncMarketplacePayoutRun(tx, payoutItem.payoutRunId);
  });

  return getMarketplacePayoutRun(input.payoutRunId);
}

export async function recordMarketplacePayoutItemFailure(input: {
  payoutRunId: string;
  payoutItemId: string;
  actorId: string;
  failureMessage: string;
  failureCode?: string;
}): Promise<MarketplacePayoutRunDetail> {
  const failureMessage = input.failureMessage.trim();
  if (!failureMessage) {
    throw new Error("A failure reason is required.");
  }

  await db.$transaction(async (tx) => {
    const payoutItem = await tx.marketplacePayoutItem.findUnique({
      where: { id: input.payoutItemId },
      include: {
        revenue: {
          select: {
            id: true,
            publisherOrgId: true,
            status: true,
          },
        },
        payoutRun: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!payoutItem || payoutItem.payoutRunId !== input.payoutRunId) {
      throw new Error("Marketplace payout item not found.");
    }

    if (payoutItem.status === "paid") {
      throw new Error("Paid payout items cannot be marked failed.");
    }

    if (payoutItem.status === "failed") {
      throw new Error("This payout item is already marked failed.");
    }

    if (payoutItem.payoutRun.status === "cancelled") {
      throw new Error("Cancelled payout runs cannot be updated.");
    }

    if (
      !canManuallyResolveMarketplacePayoutItem(
        payoutItem.payoutRun.status,
        payoutItem.status,
      )
    ) {
      throw new Error(
        "Manual failure resolution is only allowed for manual-review payout items after execution has started.",
      );
    }

    const claim = await tx.marketplacePayoutItem.updateMany({
      where: {
        id: payoutItem.id,
        status: payoutItem.status,
      },
      data: {
        status: "processing",
        lastAttemptAt: new Date(),
      },
    });

    if (claim.count !== 1) {
      throw new Error("This payout item is already being updated.");
    }

    const attemptId = await ensureResolutionAttempt(
      tx,
      payoutItem.id,
      payoutItem.payoutRunId,
      "failed",
    );

    await tx.marketplacePayoutAttempt.update({
      where: { id: attemptId },
      data: {
        status: "failed",
        failureCode: normalizeOptionalText(input.failureCode),
        failureMessage,
        responsePayload: {
          manualFailure: true,
        },
        processedAt: new Date(),
      },
    });

    await tx.marketplacePayoutItem.update({
      where: { id: payoutItem.id },
      data: {
        status: "failed",
        failureCode: normalizeOptionalText(input.failureCode),
        failureMessage,
        manualReviewReason: null,
      },
    });

    await tx.marketplaceRevenue.update({
      where: { id: payoutItem.revenueId },
      data: {
        status: "failed",
        failureReason: failureMessage,
      },
    });

    await createMarketplacePayoutEvent(tx, {
      publisherOrgId: payoutItem.publisherOrgId,
      payoutRunId: payoutItem.payoutRunId,
      payoutItemId: payoutItem.id,
      payoutAttemptId: attemptId,
      revenueId: payoutItem.revenueId,
      actorId: input.actorId,
      eventType: "marketplace.payout_item.failed",
      fromStatus: payoutItem.revenue.status,
      toStatus: "failed",
      reason: failureMessage,
      metadata: {
        failureCode: normalizeOptionalText(input.failureCode),
      },
    });

    await tx.auditLog.create({
      data: {
        orgId: payoutItem.publisherOrgId,
        actorId: input.actorId,
        action: "marketplace.payout_item.failed",
        entityType: "marketplace_payout_item",
        entityId: payoutItem.id,
        metadata: {
          payoutRunId: payoutItem.payoutRunId,
          failureCode: normalizeOptionalText(input.failureCode),
          failureMessage,
        },
      },
    });

    await syncMarketplacePayoutRun(tx, payoutItem.payoutRunId);
  });

  return getMarketplacePayoutRun(input.payoutRunId);
}

async function getMarketplacePayoutRunInternal(
  client: Prisma.TransactionClient,
  payoutRunId: string,
): Promise<MarketplacePayoutRunDetail> {
  const run = await client.marketplacePayoutRun.findUnique({
    where: { id: payoutRunId },
    include: {
      items: {
        include: {
          beneficiary: {
            select: {
              status: true,
            },
          },
          revenue: {
            select: {
              status: true,
              purchase: {
                select: {
                  template: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          publisherOrg: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!run) {
    throw new Error("Marketplace payout run not found.");
  }

  return {
    id: run.id,
    runNumber: run.runNumber,
    status: run.status,
    providerName: run.providerName,
    totalAmount: toNumber(run.totalAmount),
    itemCount: run.itemCount,
    successCount: run.successCount,
    failureCount: run.failureCount,
    manualReviewCount: run.manualReviewCount,
    notes: run.notes ?? null,
    createdAt: run.createdAt.toISOString(),
    approvedAt: run.approvedAt?.toISOString() ?? null,
    executedAt: run.executedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    failedAt: run.failedAt?.toISOString() ?? null,
    items: run.items.map((item) => ({
      id: item.id,
      publisherOrgId: item.publisherOrg.id,
      publisherOrgName: item.publisherOrg.name,
      templateId: item.revenue.purchase.template.id,
      templateName: item.revenue.purchase.template.name,
      amount: toNumber(item.amount),
      revenueStatus: item.revenue.status,
      status: item.status,
      beneficiaryStatus: item.beneficiary.status,
      attemptCount: item.attemptCount,
      externalReferenceId: item.externalReferenceId ?? null,
      providerReferenceId: item.providerReferenceId ?? null,
      failureMessage: item.failureMessage ?? null,
      manualReviewReason: item.manualReviewReason ?? null,
      settledAt: item.settledAt?.toISOString() ?? null,
    })),
  };
}

export async function getMarketplacePayoutRun(
  payoutRunId: string,
): Promise<MarketplacePayoutRunDetail> {
  return db.$transaction(async (tx) =>
    getMarketplacePayoutRunInternal(tx, payoutRunId),
  );
}

export async function listMarketplacePayoutRuns(filters?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  runs: MarketplacePayoutRunListEntry[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(filters?.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 20, 1), 100);
  const skip = (page - 1) * pageSize;
  const where: Prisma.MarketplacePayoutRunWhereInput = {
    ...(filters?.status ? { status: filters.status } : {}),
  };

  const [runs, total] = await Promise.all([
    db.marketplacePayoutRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        runNumber: true,
        status: true,
        providerName: true,
        totalAmount: true,
        itemCount: true,
        successCount: true,
        failureCount: true,
        manualReviewCount: true,
        createdAt: true,
        approvedAt: true,
        executedAt: true,
      },
    }),
    db.marketplacePayoutRun.count({ where }),
  ]);

  return {
    runs: runs.map((run) => ({
      id: run.id,
      runNumber: run.runNumber,
      status: run.status,
      providerName: run.providerName,
      totalAmount: toNumber(run.totalAmount),
      itemCount: run.itemCount,
      successCount: run.successCount,
      failureCount: run.failureCount,
      manualReviewCount: run.manualReviewCount,
      createdAt: run.createdAt.toISOString(),
      approvedAt: run.approvedAt?.toISOString() ?? null,
      executedAt: run.executedAt?.toISOString() ?? null,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPublisherPayoutSummary(
  publisherOrgId: string,
): Promise<PublisherPayoutSummary> {
  const beneficiary = await getMarketplacePayoutBeneficiarySummary(publisherOrgId);

  const revenues = await db.marketplaceRevenue.findMany({
    where: { publisherOrgId },
    select: {
      publisherShare: true,
      status: true,
      paidOutAt: true,
    },
  });

  let totalEarned = 0;
  let amountPending = 0;
  let amountOnHold = 0;
  let amountPaid = 0;
  let amountFailed = 0;
  let lastPaidAt: Date | null = null;

  for (const revenue of revenues) {
    const amount = toNumber(revenue.publisherShare);
    totalEarned += amount;

    if (["pending", "eligible", "queued_for_payout"].includes(revenue.status)) {
      amountPending += amount;
    }
    if (revenue.status === "on_hold") {
      amountOnHold += amount;
    }
    if (revenue.status === "paid") {
      amountPaid += amount;
      if (!lastPaidAt || (revenue.paidOutAt && revenue.paidOutAt > lastPaidAt)) {
        lastPaidAt = revenue.paidOutAt;
      }
    }
    if (revenue.status === "failed") {
      amountFailed += amount;
    }
  }

  return {
    totalEarned,
    amountPending,
    amountOnHold,
    amountPaid,
    amountFailed,
    lastPaidAt: lastPaidAt?.toISOString() ?? null,
    beneficiary,
  };
}

export async function listPublisherPayoutHistory(
  publisherOrgId: string,
  limit?: number,
): Promise<PublisherPayoutHistoryEntry[]> {
  const items = await db.marketplacePayoutItem.findMany({
    where: { publisherOrgId },
    include: {
      payoutRun: {
        select: {
          id: true,
          runNumber: true,
        },
      },
      revenue: {
        select: {
          purchase: {
            select: {
              template: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    ...(typeof limit === "number" ? { take: limit } : {}),
  });

  return items.map((item) => ({
    payoutItemId: item.id,
    payoutRunId: item.payoutRun.id,
    payoutRunNumber: item.payoutRun.runNumber,
    templateName: item.revenue.purchase.template.name,
    amount: toNumber(item.amount),
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    settledAt: item.settledAt?.toISOString() ?? null,
    externalReferenceId: item.externalReferenceId ?? null,
    failureMessage: item.failureMessage ?? null,
  }));
}

export async function exportPublisherPayoutStatementCsv(
  publisherOrgId: string,
): Promise<string> {
  const history = await listPublisherPayoutHistory(publisherOrgId);

  return generateCSV(
    [
      "Run Number",
      "Template",
      "Amount",
      "Status",
      "Created At",
      "Settled At",
      "External Reference",
      "Failure Message",
    ],
    history.map((row) => [
      row.payoutRunNumber,
      row.templateName,
      row.amount.toFixed(2),
      row.status,
      row.createdAt,
      row.settledAt ?? "",
      row.externalReferenceId ?? "",
      row.failureMessage ?? "",
    ]),
  );
}

export async function reconcileOpenMarketplacePayoutRuns(): Promise<{
  processedRuns: number;
  manualReviewItems: number;
}> {
  return db.$transaction(async (tx) => {
    const runs = await tx.marketplacePayoutRun.findMany({
      where: { status: "processing" },
      select: { id: true },
    });

    let manualReviewItems = 0;

    for (const run of runs) {
      manualReviewItems += await tx.marketplacePayoutItem.count({
        where: {
          payoutRunId: run.id,
          status: "manual_review",
        },
      });

      await syncMarketplacePayoutRun(tx, run.id);
    }

    return {
      processedRuns: runs.length,
      manualReviewItems,
    };
  });
}
