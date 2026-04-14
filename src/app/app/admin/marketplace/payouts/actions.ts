"use server";

import { revalidatePath } from "next/cache";
import {
  requireMarketplaceFinance,
  requireMarketplaceFinanceOrModerator,
} from "@/lib/auth";
import {
  getMarketplacePayoutBeneficiarySummary,
  verifyMarketplacePayoutBeneficiary,
} from "@/lib/payouts/beneficiary";
import {
  holdMarketplaceRevenue,
  releaseMarketplaceRevenueHold,
} from "@/lib/payouts/eligibility";
import {
  approveMarketplacePayoutRun,
  buildMarketplacePayoutRun,
  executeMarketplacePayoutRun,
  getMarketplacePayoutRun,
  listMarketplacePayoutRuns,
  recordMarketplacePayoutItemFailure,
  recordMarketplacePayoutItemPaid,
} from "@/lib/payouts/runs";
import { db } from "@/lib/db";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function revalidateMarketplacePayoutRoutes(runId?: string) {
  revalidatePath("/app/admin/marketplace/payouts");
  if (runId) {
    revalidatePath(`/app/admin/marketplace/payouts/${runId}`);
  }
  revalidatePath("/app/docs/templates/publisher/payouts");
  revalidatePath("/app/docs/templates/publisher/payouts/setup");
}

export async function getMarketplaceAdminPayoutOverview(filters?: {
  status?: string;
  page?: number;
}): Promise<
  ActionResult<{
    runs: Awaited<ReturnType<typeof listMarketplacePayoutRuns>>;
    summary: {
      eligibleItemCount: number;
      eligibleTotalAmount: number;
      heldItemCount: number;
      heldTotalAmount: number;
      pendingBeneficiaryCount: number;
    };
    eligibleRevenue: Array<{
      id: string;
      publisherOrgId: string;
      publisherOrgName: string;
      templateName: string;
      amount: number;
      status: string;
      eligibleAt: string | null;
    }>;
    heldRevenue: Array<{
      id: string;
      publisherOrgId: string;
      publisherOrgName: string;
      templateName: string;
      amount: number;
      status: string;
      onHoldReason: string | null;
    }>;
    pendingBeneficiaries: Array<{
      publisherOrgId: string;
      publisherOrgName: string;
      beneficiary: Awaited<ReturnType<typeof getMarketplacePayoutBeneficiarySummary>>;
    }>;
  }>
> {
  try {
    await requireMarketplaceFinanceOrModerator();

    const [runs, eligibleAggregate, heldAggregate, pendingBeneficiaryRaw, eligibleRevenue, heldRevenue] =
      await Promise.all([
        listMarketplacePayoutRuns({
          status: filters?.status,
          page: filters?.page,
        }),
        db.marketplaceRevenue.aggregate({
          where: {
            status: "eligible",
            payoutItems: { none: {} },
          },
          _count: { _all: true },
          _sum: { publisherShare: true },
        }),
        db.marketplaceRevenue.aggregate({
          where: { status: "on_hold" },
          _count: { _all: true },
          _sum: { publisherShare: true },
        }),
        db.marketplacePayoutBeneficiary.findMany({
          where: { status: { not: "verified" } },
          include: {
            publisherOrg: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { updatedAt: "asc" },
        }),
        db.marketplaceRevenue.findMany({
          where: {
            status: "eligible",
            payoutItems: { none: {} },
          },
          take: 20,
          orderBy: { eligibleAt: "asc" },
          include: {
            publisherOrg: {
              select: { id: true, name: true },
            },
            purchase: {
              select: {
                template: {
                  select: { name: true },
                },
              },
            },
          },
        }),
        db.marketplaceRevenue.findMany({
          where: { status: "on_hold" },
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            publisherOrg: {
              select: { id: true, name: true },
            },
            purchase: {
              select: {
                template: {
                  select: { name: true },
                },
              },
            },
          },
        }),
      ]);

    const pendingBeneficiaries = pendingBeneficiaryRaw.map((row) => ({
      publisherOrgId: row.publisherOrg.id,
      publisherOrgName: row.publisherOrg.name,
      beneficiary: {
        id: row.id,
        publisherOrgId: row.publisherOrgId,
        accountHolderName: row.accountHolderName,
        payoutMethod: row.payoutMethod,
        bankAccountMasked: row.bankAccountLast4 ? `****${row.bankAccountLast4}` : null,
        status: row.status,
        providerName: row.providerName,
        providerBeneficiaryId: row.providerBeneficiaryId,
        verifiedAt: row.verifiedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      },
    }));

    return {
      success: true,
      data: {
        runs,
        summary: {
          eligibleItemCount: eligibleAggregate._count._all,
          eligibleTotalAmount: Number(eligibleAggregate._sum.publisherShare ?? 0),
          heldItemCount: heldAggregate._count._all,
          heldTotalAmount: Number(heldAggregate._sum.publisherShare ?? 0),
          pendingBeneficiaryCount: pendingBeneficiaries.length,
        },
        eligibleRevenue: eligibleRevenue.map((revenue) => ({
          id: revenue.id,
          publisherOrgId: revenue.publisherOrg.id,
          publisherOrgName: revenue.publisherOrg.name,
          templateName: revenue.purchase.template.name,
          amount: Number(revenue.publisherShare),
          status: revenue.status,
          eligibleAt: revenue.eligibleAt?.toISOString() ?? null,
        })),
        heldRevenue: heldRevenue.map((revenue) => ({
          id: revenue.id,
          publisherOrgId: revenue.publisherOrg.id,
          publisherOrgName: revenue.publisherOrg.name,
          templateName: revenue.purchase.template.name,
          amount: Number(revenue.publisherShare),
          status: revenue.status,
          onHoldReason: revenue.onHoldReason ?? null,
        })),
        pendingBeneficiaries,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load marketplace payout overview.",
    };
  }
}

export async function getMarketplaceAdminPayoutRun(
  payoutRunId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getMarketplacePayoutRun>>>> {
  try {
    await requireMarketplaceFinanceOrModerator();
    const run = await getMarketplacePayoutRun(payoutRunId);
    return { success: true, data: run };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load marketplace payout run.",
    };
  }
}

export async function buildMarketplaceAdminPayoutRun(input?: {
  minimumAmount?: number;
  notes?: string;
}): Promise<ActionResult<{ payoutRunId: string }>> {
  try {
    const { userId } = await requireMarketplaceFinance();
    const run = await buildMarketplacePayoutRun({
      actorId: userId,
      minimumAmount: input?.minimumAmount,
      notes: input?.notes,
    });

    revalidateMarketplacePayoutRoutes(run.id);
    return { success: true, data: { payoutRunId: run.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to build marketplace payout run.",
    };
  }
}

export async function approveMarketplaceAdminPayoutRun(
  payoutRunId: string,
): Promise<ActionResult<{ payoutRunId: string }>> {
  try {
    const { userId } = await requireMarketplaceFinance();
    const run = await approveMarketplacePayoutRun({
      payoutRunId,
      actorId: userId,
    });

    revalidateMarketplacePayoutRoutes(run.id);
    return { success: true, data: { payoutRunId: run.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to approve marketplace payout run.",
    };
  }
}

export async function executeMarketplaceAdminPayoutRun(
  payoutRunId: string,
): Promise<ActionResult<{ payoutRunId: string }>> {
  try {
    const { userId } = await requireMarketplaceFinance();
    const run = await executeMarketplacePayoutRun({
      payoutRunId,
      actorId: userId,
    });

    revalidateMarketplacePayoutRoutes(run.id);
    return { success: true, data: { payoutRunId: run.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to execute marketplace payout run.",
    };
  }
}

export async function recordMarketplaceAdminPayoutItemPaid(input: {
  payoutRunId: string;
  payoutItemId: string;
  externalReferenceId: string;
  providerReferenceId?: string;
  note?: string;
}): Promise<ActionResult<{ payoutRunId: string }>> {
  try {
    const { userId } = await requireMarketplaceFinance();
    const run = await recordMarketplacePayoutItemPaid({
      payoutRunId: input.payoutRunId,
      payoutItemId: input.payoutItemId,
      actorId: userId,
      externalReferenceId: input.externalReferenceId,
      providerReferenceId: input.providerReferenceId,
      note: input.note,
    });

    revalidateMarketplacePayoutRoutes(run.id);
    return { success: true, data: { payoutRunId: run.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark marketplace payout item paid.",
    };
  }
}

export async function recordMarketplaceAdminPayoutItemFailure(input: {
  payoutRunId: string;
  payoutItemId: string;
  failureMessage: string;
  failureCode?: string;
}): Promise<ActionResult<{ payoutRunId: string }>> {
  try {
    const { userId } = await requireMarketplaceFinance();
    const run = await recordMarketplacePayoutItemFailure({
      payoutRunId: input.payoutRunId,
      payoutItemId: input.payoutItemId,
      actorId: userId,
      failureMessage: input.failureMessage,
      failureCode: input.failureCode,
    });

    revalidateMarketplacePayoutRoutes(run.id);
    return { success: true, data: { payoutRunId: run.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark marketplace payout item failed.",
    };
  }
}

export async function holdMarketplaceAdminRevenue(input: {
  revenueId: string;
  reason: string;
}): Promise<ActionResult<null>> {
  try {
    const { userId } = await requireMarketplaceFinanceOrModerator();
    await holdMarketplaceRevenue(input.revenueId, userId, input.reason);
    revalidateMarketplacePayoutRoutes();
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to hold marketplace revenue.",
    };
  }
}

export async function releaseMarketplaceAdminRevenueHold(
  revenueId: string,
): Promise<ActionResult<null>> {
  try {
    const { userId } = await requireMarketplaceFinance();
    await releaseMarketplaceRevenueHold(revenueId, userId);
    revalidateMarketplacePayoutRoutes();
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to release marketplace revenue hold.",
    };
  }
}

export async function verifyMarketplaceAdminBeneficiary(input: {
  publisherOrgId: string;
  verificationReference?: string;
  verificationNotes?: string;
}): Promise<ActionResult<{ publisherOrgId: string }>> {
  try {
    const { userId } = await requireMarketplaceFinance();
    await verifyMarketplacePayoutBeneficiary({
      publisherOrgId: input.publisherOrgId,
      actorId: userId,
      verificationReference: input.verificationReference,
      verificationNotes: input.verificationNotes,
    });

    revalidateMarketplacePayoutRoutes();
    return { success: true, data: { publisherOrgId: input.publisherOrgId } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to verify marketplace payout beneficiary.",
    };
  }
}
