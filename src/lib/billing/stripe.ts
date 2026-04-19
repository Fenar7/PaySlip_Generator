/**
 * Phase 28.1: Stripe Gateway Adapter
 *
 * Implements the Stripe-specific operations for the dual-gateway billing engine.
 * Used for international customers (non-India).
 */

import type { CheckoutParams, CheckoutResult } from "./types";
import { createHmac, timingSafeEqual } from "crypto";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";

// Plan price mappings for Stripe (environment-configured)
const STRIPE_PRICE_IDS: Record<string, Record<string, string>> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? "",
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY ?? "",
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? "",
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY ?? "",
  },
};

async function stripeRequest<T>(path: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const url = `https://api.stripe.com/v1${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const formBody = body ? encodeFormData(body) : undefined;

  const response = await fetch(url, { method, headers, body: formBody });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Stripe API error: ${response.status} - ${JSON.stringify(error)}`);
  }
  return response.json() as Promise<T>;
}

function encodeFormData(data: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (value !== null && value !== undefined) {
      if (typeof value === "object" && !Array.isArray(value)) {
        parts.push(encodeFormData(value as Record<string, unknown>, fullKey));
      } else {
        parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
      }
    }
  }
  return parts.filter(Boolean).join("&");
}

export async function createStripeCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  const priceId = STRIPE_PRICE_IDS[params.planId]?.[params.billingInterval];
  if (!priceId) {
    throw new Error(`No Stripe price configured for ${params.planId}/${params.billingInterval}`);
  }

  const session = await stripeRequest<{ id: string; url: string }>("/checkout/sessions", "POST", {
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    customer_email: params.billingEmail,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    "metadata[orgId]": params.orgId,
    "metadata[planId]": params.planId,
    "metadata[billingInterval]": params.billingInterval,
    "subscription_data[trial_period_days]": "14",
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    gateway: "STRIPE",
  };
}

export async function cancelStripeSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void> {
  if (atPeriodEnd) {
    await stripeRequest(`/subscriptions/${subscriptionId}`, "POST", {
      cancel_at_period_end: "true",
    });
  } else {
    await stripeRequest(`/subscriptions/${subscriptionId}`, "DELETE");
  }
}

export async function pauseStripeSubscription(subscriptionId: string): Promise<void> {
  await stripeRequest(`/subscriptions/${subscriptionId}`, "POST", {
    pause_collection: { behavior: "void" },
  });
}

export async function resumeStripeSubscription(subscriptionId: string): Promise<void> {
  await stripeRequest(`/subscriptions/${subscriptionId}`, "POST", {
    pause_collection: "",
  });
}

export async function retryStripePayment(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sub = await stripeRequest<{ latest_invoice: string }>(`/subscriptions/${subscriptionId}`, "GET");
    if (sub.latest_invoice) {
      await stripeRequest(`/invoices/${sub.latest_invoice}/pay`, "POST");
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Verify Stripe webhook signature using HMAC SHA-256.
 */
export function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string,
): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!secret) return false;

  const elements = signatureHeader.split(",");
  const timestampStr = elements.find((e) => e.startsWith("t="))?.slice(2);
  const signatures = elements
    .filter((e) => e.startsWith("v1="))
    .map((e) => e.slice(3));

  if (!timestampStr || signatures.length === 0) return false;

  const timestamp = parseInt(timestampStr, 10);
  const tolerance = 300; // 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  return signatures.some((sig) =>
    timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSignature, "hex")),
  );
}
