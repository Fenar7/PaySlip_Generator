import "server-only";
import Razorpay from "razorpay";
import type { Subscriptions } from "razorpay/dist/types/subscriptions";
import crypto from "crypto";

let razorpayInstance: Razorpay | null = null;

type PaymentLinkCreateParams = {
  amount: number;
  currency: string;
  description: string;
  reference_id: string;
  customer?: { name?: string; email?: string; contact?: string };
  expire_by?: number;
  notify: {
    sms: boolean;
    email: boolean;
  };
  reminder_enable: boolean;
};

type PaymentLinkResponse = {
  id: string;
  short_url: string;
};

type VirtualAccountCreateParams = {
  receivers: { types: string[] };
  description: string;
  customer_id?: string;
  close_by?: number;
  notes?: Record<string, string>;
};

type VirtualAccountResponse = {
  id: string;
  receivers: { account_number: string; ifsc: string }[];
};

type RazorpaySubscriptionsWithExtras = Razorpay["subscriptions"] & {
  update(
    subscriptionId: string,
    payload: Record<string, string>,
  ): Promise<Subscriptions.RazorpaySubscription>;
  resume(
    subscriptionId: string,
    payload: { resume_at: "now" },
  ): Promise<Subscriptions.RazorpaySubscription>;
};

type RazorpayWithExtras = Razorpay & {
  paymentLink: {
    create(payload: PaymentLinkCreateParams): Promise<PaymentLinkResponse>;
  };
  virtualAccounts: {
    create(payload: VirtualAccountCreateParams): Promise<VirtualAccountResponse>;
  };
  subscriptions: RazorpaySubscriptionsWithExtras;
};

function getRazorpayWithExtras(): RazorpayWithExtras | null {
  const rp = getRazorpay();
  return rp as RazorpayWithExtras | null;
}

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

  if (!signature || signature.length !== expectedSignature.length) {
    return false;
  }

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

  // The Razorpay REST API accepts customer_id at the top level but the SDK
  // typings omit it.  We spread it in and assert to satisfy TypeScript while
  // ensuring the customer is properly linked to the subscription.
  const body = {
    plan_id: params.planId,
    customer_id: params.customerId,
    total_count: params.totalCount ?? 60,
    quantity: params.quantity ?? 1,
    customer_notify: 1 as const,
  } as Parameters<Razorpay["subscriptions"]["create"]>[0];

  return rp.subscriptions.create(body);
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
  const rp = getRazorpayWithExtras();
  if (!rp) return null;

  return rp.paymentLink.create({
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

  const client = rp as RazorpayWithExtras;
  return client.virtualAccounts.create({
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
  const rp = getRazorpayWithExtras();
  if (!rp) return null;

  return rp.subscriptions.update(subscriptionId, {
    pause_initiated_by: "customer",
    ...(pauseAt && { pause_at: pauseAt }),
  });
}

export async function resumeRazorpaySubscription(
  subscriptionId: string,
): Promise<Subscriptions.RazorpaySubscription | null> {
  const rp = getRazorpayWithExtras();
  if (!rp) return null;

  return rp.subscriptions.resume(
    subscriptionId,
    { resume_at: "now" },
  );
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
