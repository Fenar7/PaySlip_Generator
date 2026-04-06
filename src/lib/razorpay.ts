import "server-only";
import Razorpay from "razorpay";
import type { Subscriptions } from "razorpay/dist/types/subscriptions";
import crypto from "crypto";

let razorpayInstance: Razorpay | null = null;

export function getRazorpay(): Razorpay | null {
  if (razorpayInstance) return razorpayInstance;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.warn(
      "[Razorpay] API keys not configured — billing features disabled",
    );
    return null;
  }

  razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpayInstance;
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

export async function createRazorpayCustomer(params: {
  name: string;
  email: string;
  contact?: string;
}): Promise<{ id: string } | null> {
  const rp = getRazorpay();
  if (!rp) return null;

  return rp.customers.create({
    name: params.name,
    email: params.email,
    contact: params.contact,
  }) as Promise<{ id: string }>;
}

export async function createRazorpaySubscription(params: {
  planId: string;
  customerId: string;
  totalCount?: number;
  quantity?: number;
}): Promise<Subscriptions.RazorpaySubscription | null> {
  const rp = getRazorpay();
  if (!rp) return null;

  // Razorpay REST API accepts customer_id but SDK types omit it
  const body = {
    plan_id: params.planId,
    total_count: params.totalCount ?? 60,
    quantity: params.quantity ?? 1,
    customer_notify: 1 as const,
  };

  return rp.subscriptions.create({
    ...body,
    notes: { customer_id: params.customerId },
  });
}

export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtEnd: boolean = true,
): Promise<Subscriptions.RazorpaySubscription | null> {
  const rp = getRazorpay();
  if (!rp) return null;

  return rp.subscriptions.cancel(subscriptionId, cancelAtEnd);
}

export async function fetchRazorpaySubscription(
  subscriptionId: string,
): Promise<Subscriptions.RazorpaySubscription | null> {
  const rp = getRazorpay();
  if (!rp) return null;

  return rp.subscriptions.fetch(subscriptionId);
}
