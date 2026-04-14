"use server";

import { revalidatePath } from "next/cache";
import {
  requireMarketplacePublisherAdmin,
} from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import {
  getMarketplacePayoutBeneficiarySummary,
  upsertMarketplacePayoutBeneficiary,
} from "@/lib/payouts/beneficiary";
import {
  exportPublisherPayoutStatementCsv,
  getPublisherPayoutSummary,
  listPublisherPayoutHistory,
} from "@/lib/payouts/runs";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requirePublisherPayoutAccess() {
  const context = await requireMarketplacePublisherAdmin();
  const allowed = await checkFeature(context.orgId, "templatePublish");

  if (!allowed) {
    throw new Error(
      "Publisher payout operations require marketplace publishing on a Pro plan or higher.",
    );
  }

  return context;
}

export async function getPublisherPayoutSetup(): Promise<
  ActionResult<{
    beneficiary: Awaited<ReturnType<typeof getMarketplacePayoutBeneficiarySummary>>;
  }>
> {
  try {
    const { orgId } = await requirePublisherPayoutAccess();
    const beneficiary = await getMarketplacePayoutBeneficiarySummary(orgId);
    return { success: true, data: { beneficiary } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load payout beneficiary settings.",
    };
  }
}

export async function savePublisherPayoutBeneficiary(input: {
  accountHolderName: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}): Promise<
  ActionResult<{
    beneficiary: Awaited<ReturnType<typeof getMarketplacePayoutBeneficiarySummary>>;
  }>
> {
  try {
    const { orgId, userId } = await requirePublisherPayoutAccess();
    const beneficiary = await upsertMarketplacePayoutBeneficiary({
      publisherOrgId: orgId,
      actorId: userId,
      accountHolderName: input.accountHolderName,
      bankAccountNumber: input.bankAccountNumber,
      ifscCode: input.ifscCode,
      upiId: input.upiId,
    });

    revalidatePath("/app/docs/templates/publisher/payouts");
    revalidatePath("/app/docs/templates/publisher/payouts/setup");

    return { success: true, data: { beneficiary } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save payout beneficiary settings.",
    };
  }
}

export async function getPublisherPayoutDashboard(): Promise<
  ActionResult<{
    summary: Awaited<ReturnType<typeof getPublisherPayoutSummary>>;
    history: Awaited<ReturnType<typeof listPublisherPayoutHistory>>;
  }>
> {
  try {
    const { orgId } = await requirePublisherPayoutAccess();
    const [summary, history] = await Promise.all([
      getPublisherPayoutSummary(orgId),
      listPublisherPayoutHistory(orgId, 50),
    ]);

    return {
      success: true,
      data: {
        summary,
        history,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load publisher payout dashboard.",
    };
  }
}

export async function exportPublisherPayoutStatement(): Promise<
  ActionResult<{ csv: string }>
> {
  try {
    const { orgId } = await requirePublisherPayoutAccess();
    const csv = await exportPublisherPayoutStatementCsv(orgId);
    return { success: true, data: { csv } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to export publisher payout statement.",
    };
  }
}
