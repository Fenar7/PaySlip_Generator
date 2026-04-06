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

export async function createPaymentLink(params: {
  amount: number;
  currency?: string;
  description: string;
  referenceId: string;
  customer?: { name?: string; email?: string; contact?: string };
  expireBy?: number;
  notifySms?: boolean;
  notifyEmail?: boolean;
  reminderEnable?: boolean;
}): Promise<{ id: string; short_url: string } | null> {
  const rp = getRazorpay();
  if (!rp) return null;

  return (rp as any).paymentLink.create({
    amount: params.amount,
    currency: params.currency ?? "INR",
    description: params.description,
    reference_id: params.referenceId,
    customer: params.customer,
    expire_by: params.expireBy,
    notify: {
      sms: params.notifySms ?? false,
      email: params.notifyEmail ?? true,
    },
    reminder_enable: params.reminderEnable ?? true,
  }) as Promise<{ id: string; short_url: string }>;
}

export async function createVirtualAccount(params: {
  receiverTypes: string[];
  description: string;
  customerId?: string;
  closeBy?: number;
  notes?: Record<string, string>;
}): Promise<{
  id: string;
  receivers: { account_number: string; ifsc: string }[];
} | null> {
  const rp = getRazorpay();
  if (!rp) return null;

  // Virtual Accounts API may not have SDK types — use any-cast
  return (rp as any).virtualAccounts.create({
    receivers: { types: params.receiverTypes },
    description: params.description,
    customer_id: params.customerId,
    close_by: params.closeBy,
    notes: params.notes,
  }) as Promise<{
    id: string;
    receivers: { account_number: string; ifsc: string }[];
  }>;
}

export async function pauseRazorpaySubscription(
  subscriptionId: string,
  pauseAt?: "now",
): Promise<Subscriptions.RazorpaySubscription | null> {
  const rp = getRazorpay();
  if (!rp) return null;

  return (rp as any).subscriptions.update(subscriptionId, {
    pause_initiated_by: "customer",
    ...(pauseAt && { pause_at: pauseAt }),
  }) as Promise<Subscriptions.RazorpaySubscription>;
}

export async function resumeRazorpaySubscription(
  subscriptionId: string,
): Promise<Subscriptions.RazorpaySubscription | null> {
  const rp = getRazorpay();
  if (!rp) return null;

  return (rp as any).subscriptions.resume(
    subscriptionId,
    { resume_at: "now" },
  ) as Promise<Subscriptions.RazorpaySubscription>;
}

export async function changeSubscriptionPlan(
  subscriptionId: string,
  newPlanId: string,
  immediate: boolean = false,
): Promise<Subscriptions.RazorpaySubscription | null> {
  const rp = getRazorpay();
  if (!rp) return null;

  return rp.subscriptions.update(subscriptionId, {
    plan_id: newPlanId,
    ...(immediate && { schedule_change_at: "now" }),
  });
}
