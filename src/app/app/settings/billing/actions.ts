"use server";

/**
 * Phase 28.1: Billing Settings Server Actions
 *
 * Manages subscription checkout, plan switching, cancellation,
 * and billing history for the current org.
 */

import { requireOrgContext, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { initiateCheckout, cancelSubscription, pauseSubscription, resumeSubscription } from "@/lib/billing/engine";
import { listBillingInvoices } from "@/lib/billing/invoicing";
import { getDunningHistory, getNextDunningAttempt } from "@/lib/billing/dunning";
import { getCurrentUsage } from "@/lib/billing/metering";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function initiatePlanCheckoutAction(params: {
  planId: string;
  billingInterval: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
}): Promise<ActionResult<{ checkoutUrl: string }>> {
  const { orgId, userId } = await requireRole("admin");

  const org = await db.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: {
      id: true,
      members: {
        where: { userId },
        select: { user: { select: { email: true } } },
      },
    },
  });

  const billingEmail = org.members[0]?.user?.email ?? "";

  const result = await initiateCheckout({
    orgId,
    planId: params.planId,
    billingInterval: params.billingInterval,
    billingEmail,
    billingCountry: "IN", // Default; can be enhanced with org country
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
  });

  return { success: true, data: { checkoutUrl: result.checkoutUrl } };
}

export async function cancelSubscriptionAction(params: {
  atPeriodEnd: boolean;
}): Promise<ActionResult<{ status: string }>> {
  const { orgId } = await requireRole("admin");

  await cancelSubscription(orgId, params.atPeriodEnd);
  return { success: true, data: { status: "canceled" } };
}

export async function pauseSubscriptionAction(params: {
  reason?: string;
}): Promise<ActionResult<{ status: string }>> {
  const { orgId } = await requireRole("admin");

  await pauseSubscription(orgId, params.reason);
  return { success: true, data: { status: "paused" } };
}

export async function resumeSubscriptionAction(): Promise<ActionResult<{ status: string }>> {
  const { orgId } = await requireRole("admin");

  await resumeSubscription(orgId);
  return { success: true, data: { status: "active" } };
}

export async function getBillingDashboardData(): Promise<ActionResult<{
  subscription: {
    planId: string;
    status: string;
    billingInterval: string | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    trialEndsAt: Date | null;
  } | null;
  billingAccount: {
    gateway: string;
    billingEmail: string;
    billingCountry: string;
    currency: string;
  } | null;
  usage: Record<string, number>;
  recentInvoices: Array<{
    id: string;
    amountPaise: bigint;
    periodStart: Date;
    periodEnd: Date;
    status: string;
  }>;
  dunningStatus: {
    attemptNumber: number;
    scheduledDay: number;
    willCancel: boolean;
  } | null;
}>> {
  const { orgId } = await requireOrgContext();

  const [subscription, billingAccount, usage, invoiceData] = await Promise.all([
    db.subscription.findUnique({
      where: { orgId },
      select: {
        planId: true,
        status: true,
        billingInterval: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        trialEndsAt: true,
        id: true,
      },
    }),
    db.billingAccount.findUnique({
      where: { orgId },
      select: { gateway: true, billingEmail: true, billingCountry: true, currency: true },
    }),
    getCurrentUsage(orgId),
    listBillingInvoices(1, 5),
  ]);

  let dunningStatus = null;
  if (subscription?.status === "past_due") {
    dunningStatus = await getNextDunningAttempt(subscription.id);
  }

  return {
    success: true,
    data: {
      subscription: subscription
        ? {
            planId: subscription.planId,
            status: subscription.status,
            billingInterval: subscription.billingInterval,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            trialEndsAt: subscription.trialEndsAt,
          }
        : null,
      billingAccount: billingAccount
        ? {
            gateway: billingAccount.gateway,
            billingEmail: billingAccount.billingEmail,
            billingCountry: billingAccount.billingCountry,
            currency: billingAccount.currency,
          }
        : null,
      usage,
      recentInvoices: invoiceData.invoices.map((inv) => ({
        id: inv.id,
        amountPaise: inv.amountPaise,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        status: inv.status,
      })),
      dunningStatus,
    },
  };
}

export async function getBillingEventsAction(page: number = 1): Promise<ActionResult<{
  events: Array<{
    id: string;
    type: string;
    amount: bigint | null;
    currency: string | null;
    createdAt: Date;
  }>;
  total: number;
}>> {
  const { orgId } = await requireOrgContext();

  const account = await db.billingAccount.findUnique({ where: { orgId } });
  if (!account) {
    return { success: true, data: { events: [], total: 0 } };
  }

  const pageSize = 20;
  const [events, total] = await Promise.all([
    db.billingEvent.findMany({
      where: { billingAccountId: account.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, type: true, amount: true, currency: true, createdAt: true },
    }),
    db.billingEvent.count({ where: { billingAccountId: account.id } }),
  ]);

  return { success: true, data: { events, total } };
}
