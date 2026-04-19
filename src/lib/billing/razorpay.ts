/**
 * Phase 28.1: Razorpay Gateway Adapter
 *
 * Implements Razorpay-specific operations for the dual-gateway billing engine.
 * Used for Indian customers (INR).
 */

import type { CheckoutParams, CheckoutResult } from "./types";
import { createHmac, timingSafeEqual } from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

const RAZORPAY_PLAN_IDS: Record<string, Record<string, string>> = {
  starter: {
    monthly: process.env.RAZORPAY_PLAN_STARTER_MONTHLY ?? "",
    yearly: process.env.RAZORPAY_PLAN_STARTER_YEARLY ?? "",
  },
  pro: {
    monthly: process.env.RAZORPAY_PLAN_PRO_MONTHLY ?? "",
    yearly: process.env.RAZORPAY_PLAN_PRO_YEARLY ?? "",
  },
  enterprise: {
    monthly: process.env.RAZORPAY_PLAN_ENTERPRISE_MONTHLY ?? "",
    yearly: process.env.RAZORPAY_PLAN_ENTERPRISE_YEARLY ?? "",
  },
};

async function razorpayRequest<T>(path: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const url = `https://api.razorpay.com/v1${path}`;
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Razorpay API error: ${response.status} - ${JSON.stringify(error)}`);
  }
  return response.json() as Promise<T>;
}

export async function createRazorpayCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  const planId = RAZORPAY_PLAN_IDS[params.planId]?.[params.billingInterval];
  if (!planId) {
    throw new Error(`No Razorpay plan configured for ${params.planId}/${params.billingInterval}`);
  }

  const subscription = await razorpayRequest<{ id: string; short_url: string }>(
    "/subscriptions",
    "POST",
    {
      plan_id: planId,
      total_count: params.billingInterval === "yearly" ? 10 : 120, // max billing cycles
      quantity: 1,
      customer_notify: 1,
      notes: {
        orgId: params.orgId,
        planId: params.planId,
        billingInterval: params.billingInterval,
      },
    },
  );

  return {
    checkoutUrl: subscription.short_url,
    sessionId: subscription.id,
    gateway: "RAZORPAY",
  };
}

export async function cancelRazorpaySubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void> {
  await razorpayRequest(`/subscriptions/${subscriptionId}/cancel`, "POST", {
    cancel_at_cycle_end: atPeriodEnd ? 1 : 0,
  });
}

export async function pauseRazorpaySubscription(subscriptionId: string): Promise<void> {
  await razorpayRequest(`/subscriptions/${subscriptionId}/pause`, "POST", {
    pause_initiated_by: "customer",
  });
}

export async function resumeRazorpaySubscription(subscriptionId: string): Promise<void> {
  await razorpayRequest(`/subscriptions/${subscriptionId}/resume`, "POST", {
    resume_initiated_by: "customer",
  });
}

export async function retryRazorpayPayment(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Razorpay auto-retries; this forces a manual charge attempt
    const sub = await razorpayRequest<{ status: string; pending_invoice_id?: string }>(
      `/subscriptions/${subscriptionId}`,
      "GET",
    );
    if (sub.pending_invoice_id) {
      await razorpayRequest(`/invoices/${sub.pending_invoice_id}/notify`, "POST", {
        type: "sms",
        sms_notify: 0,
        email_notify: 1,
      });
    }
    return { success: sub.status === "active" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Verify Razorpay webhook signature using HMAC SHA-256.
 */
export function verifyRazorpayWebhookSignature(
  payload: string,
  signatureHeader: string,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  if (!secret) return false;

  const expectedSignature = createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signatureHeader, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch {
    return false;
  }
}
