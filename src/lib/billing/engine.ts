/**
 * Phase 28.1: Billing Engine — Gateway-agnostic orchestration layer
 *
 * Selects the correct payment gateway (Stripe for international, Razorpay for India)
 * and delegates operations through a unified interface.
 */

import { db } from "@/lib/db";
import type {
  BillingGateway,
  CheckoutParams,
  CheckoutResult,
  SubscriptionStatus,
  BillingEventType,
} from "./types";
import { MAX_PAUSE_DAYS, SUBSCRIPTION_STATUS_TRANSITIONS } from "./types";
import { createStripeCheckout, cancelStripeSubscription, pauseStripeSubscription, resumeStripeSubscription, retryStripePayment } from "./stripe";
import { createRazorpayCheckout, cancelRazorpaySubscription, pauseRazorpaySubscription, resumeRazorpaySubscription, retryRazorpayPayment } from "./razorpay";

/**
 * Determine the correct payment gateway based on billing country and currency.
 * India + INR → Razorpay; everything else → Stripe.
 */
export function resolveGateway(billingCountry: string, currency: string): BillingGateway {
  if (billingCountry.toUpperCase() === "IN" && currency.toUpperCase() === "INR") {
    return "RAZORPAY";
  }
  return "STRIPE";
}

/**
 * Get or create a BillingAccount for the org with gateway metadata.
 */
export async function getOrCreateBillingAccount(orgId: string, billingEmail?: string) {
  let account = await db.billingAccount.findUnique({ where: { orgId } });
  if (!account) {
    account = await db.billingAccount.create({
      data: { orgId, gateway: "RAZORPAY", billingEmail: billingEmail ?? "", billingCountry: "IN", currency: "INR" },
    });
  }
  return account;
}

/**
 * Initiate a checkout session for plan subscription.
 * Returns the checkout URL to redirect the user.
 */
export async function initiateCheckout(params: {
  orgId: string;
  planId: string;
  billingInterval: "monthly" | "yearly";
  billingEmail: string;
  billingCountry: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutResult> {
  const currency = params.billingCountry.toUpperCase() === "IN" ? "INR" : "USD";
  const gateway = resolveGateway(params.billingCountry, currency);

  // Ensure BillingAccount exists with correct gateway
  await db.billingAccount.upsert({
    where: { orgId: params.orgId },
    update: { gateway, billingCountry: params.billingCountry, currency, billingEmail: params.billingEmail },
    create: { orgId: params.orgId, gateway, billingCountry: params.billingCountry, currency, billingEmail: params.billingEmail },
  });

  const checkoutParams: CheckoutParams = { ...params };

  if (gateway === "STRIPE") {
    return createStripeCheckout(checkoutParams);
  }
  return createRazorpayCheckout(checkoutParams);
}

/**
 * Record a billing event in the immutable event log.
 */
export async function recordBillingEvent(params: {
  orgId: string;
  type: BillingEventType;
  gatewayEventId?: string;
  amountPaise?: bigint;
  currency?: string;
  metadata?: Record<string, unknown>;
}) {
  const account = await db.billingAccount.findUnique({ where: { orgId: params.orgId } });
  if (!account) return null;

  return db.billingEvent.create({
    data: {
      billingAccountId: account.id,
      type: params.type,
      gatewayEventId: params.gatewayEventId,
      amount: params.amountPaise,
      currency: params.currency,
      metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
    },
  });
}

/**
 * Transition subscription status with validation.
 */
export async function transitionSubscriptionStatus(
  orgId: string,
  newStatus: SubscriptionStatus,
  metadata?: { cancelledAt?: Date; pausedAt?: Date; pausedUntil?: Date; pauseReason?: string },
): Promise<void> {
  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!sub) throw new Error(`No subscription found for org ${orgId}`);

  const current = sub.status as SubscriptionStatus;
  validateTransition(current, newStatus);

  const updateData: Record<string, unknown> = { status: newStatus };

  if (newStatus === "canceled") {
    updateData.cancelledAt = metadata?.cancelledAt ?? new Date();
  }
  if (newStatus === "paused") {
    const pausedUntil = metadata?.pausedUntil ?? new Date(Date.now() + MAX_PAUSE_DAYS * 86400000);
    updateData.pausedAt = metadata?.pausedAt ?? new Date();
    updateData.pausedUntil = pausedUntil;
    updateData.pauseReason = metadata?.pauseReason ?? null;
  }
  if (newStatus === "active" && current === "paused") {
    updateData.pausedAt = null;
    updateData.pausedUntil = null;
    updateData.pauseReason = null;
  }

  await db.subscription.update({ where: { orgId }, data: updateData });
}

/**
 * Validate that a subscription status transition is allowed.
 */
function validateTransition(current: SubscriptionStatus, target: SubscriptionStatus): void {
  const allowed = SUBSCRIPTION_STATUS_TRANSITIONS[current];
  if (!allowed?.includes(target)) {
    throw new Error(`Invalid subscription transition: ${current} → ${target}`);
  }
}

/**
 * Cancel subscription via the appropriate gateway.
 */
export async function cancelSubscription(orgId: string, atPeriodEnd: boolean): Promise<void> {
  const account = await db.billingAccount.findUnique({ where: { orgId } });
  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!account || !sub) throw new Error("No billing account/subscription found");

  if (account.gateway === "STRIPE" && sub.stripeSubId) {
    await cancelStripeSubscription(sub.stripeSubId, atPeriodEnd);
  } else if (account.gateway === "RAZORPAY" && sub.razorpaySubId) {
    await cancelRazorpaySubscription(sub.razorpaySubId, atPeriodEnd);
  }

  if (atPeriodEnd) {
    await db.subscription.update({ where: { orgId }, data: { cancelAtPeriodEnd: true } });
  } else {
    await transitionSubscriptionStatus(orgId, "canceled");
  }

  await recordBillingEvent({ orgId, type: "SUBSCRIPTION_CANCELED", metadata: { atPeriodEnd } });
}

/**
 * Pause subscription (max 90 days).
 */
export async function pauseSubscription(orgId: string, reason?: string): Promise<void> {
  const account = await db.billingAccount.findUnique({ where: { orgId } });
  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!account || !sub) throw new Error("No billing account/subscription found");

  if (account.gateway === "STRIPE" && sub.stripeSubId) {
    await pauseStripeSubscription(sub.stripeSubId);
  } else if (account.gateway === "RAZORPAY" && sub.razorpaySubId) {
    await pauseRazorpaySubscription(sub.razorpaySubId);
  }

  await transitionSubscriptionStatus(orgId, "paused", {
    pauseReason: reason,
    pausedUntil: new Date(Date.now() + MAX_PAUSE_DAYS * 86400000),
  });

  await recordBillingEvent({ orgId, type: "SUBSCRIPTION_PAUSED", metadata: { reason } });
}

/**
 * Resume a paused subscription.
 */
export async function resumeSubscription(orgId: string): Promise<void> {
  const account = await db.billingAccount.findUnique({ where: { orgId } });
  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!account || !sub) throw new Error("No billing account/subscription found");

  if (account.gateway === "STRIPE" && sub.stripeSubId) {
    await resumeStripeSubscription(sub.stripeSubId);
  } else if (account.gateway === "RAZORPAY" && sub.razorpaySubId) {
    await resumeRazorpaySubscription(sub.razorpaySubId);
  }

  await transitionSubscriptionStatus(orgId, "active");
  await recordBillingEvent({ orgId, type: "SUBSCRIPTION_RESUMED" });
}

/**
 * Retry a failed payment for dunning.
 */
export async function retryFailedPayment(orgId: string): Promise<{ success: boolean; error?: string }> {
  const account = await db.billingAccount.findUnique({ where: { orgId } });
  const sub = await db.subscription.findUnique({ where: { orgId } });
  if (!account || !sub) return { success: false, error: "No billing found" };

  let result: { success: boolean; error?: string };

  if (account.gateway === "STRIPE" && sub.stripeSubId) {
    result = await retryStripePayment(sub.stripeSubId);
  } else if (account.gateway === "RAZORPAY" && sub.razorpaySubId) {
    result = await retryRazorpayPayment(sub.razorpaySubId);
  } else {
    return { success: false, error: "No gateway subscription ID" };
  }

  await recordBillingEvent({
    orgId,
    type: "DUNNING_ATTEMPT",
    metadata: { success: result.success, error: result.error },
  });

  if (result.success) {
    await transitionSubscriptionStatus(orgId, "active");
  }

  return result;
}
