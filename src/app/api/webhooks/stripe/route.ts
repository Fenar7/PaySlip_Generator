import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyStripeWebhookSignature } from "@/lib/billing/stripe";
import { generateSubscriptionInvoice } from "@/lib/billing/invoicing";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Verifies signature before processing.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  if (!verifyStripeWebhookSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(payload) as {
    id: string;
    type: string;
    data: { object: Record<string, unknown> };
  };

  // Idempotency: check if event already processed
  const existing = await db.billingEvent.findUnique({
    where: { gatewayEventId: event.id },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handleStripeEvent(event: {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}): Promise<void> {
  const obj = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const orgId = (obj.metadata as Record<string, string>)?.orgId;
      const planId = (obj.metadata as Record<string, string>)?.planId;
      const billingInterval = (obj.metadata as Record<string, string>)?.billingInterval;
      const stripeSubId = obj.subscription as string;
      const stripeCustomerId = obj.customer as string;

      if (!orgId || !stripeSubId) break;

      // Upsert billing account
      await db.billingAccount.upsert({
        where: { orgId },
        update: { stripeCustomerId, gateway: "STRIPE" },
        create: {
          orgId,
          gateway: "STRIPE",
          billingEmail: (obj.customer_email as string) ?? "",
          billingCountry:
            ((obj.customer_details as { address?: { country?: string } } | undefined)
              ?.address?.country ??
              (obj.customer_address as { country?: string } | undefined)?.country ??
              "US"),
          currency: ((obj.currency as string) ?? "usd").toUpperCase(),
          stripeCustomerId,
        },
      });

      // Update subscription
      await db.subscription.upsert({
        where: { orgId },
        update: {
          planId: planId ?? "starter",
          status: "active",
          stripeSubId,
          stripeCustomerId,
          billingInterval,
          currentPeriodStart: new Date(),
          currentPeriodEnd: getNextPeriodEnd(billingInterval ?? "monthly"),
        },
        create: {
          orgId,
          planId: planId ?? "starter",
          status: "active",
          stripeSubId,
          stripeCustomerId,
          billingInterval,
          currentPeriodStart: new Date(),
          currentPeriodEnd: getNextPeriodEnd(billingInterval ?? "monthly"),
        },
      });

      await recordEvent(orgId, event.id, "SUBSCRIPTION_CREATED");
      break;
    }

    case "invoice.payment_succeeded": {
      const subId = obj.subscription as string;
      if (!subId) break;

      const sub = await db.subscription.findFirst({
        where: { stripeSubId: subId },
      });
      if (!sub) break;

      // Reactivate if was past_due
      if (sub.status === "past_due") {
        await db.subscription.update({
          where: { id: sub.id },
          data: { status: "active" },
        });
      }

      // Generate billing invoice
      const amountPaise = BigInt((obj.amount_paid as number) ?? 0);
      const period = getStripeInvoicePeriod(obj);
      await generateSubscriptionInvoice({
        orgId: sub.orgId,
        amountPaise,
        currency: (obj.currency as string)?.toUpperCase() ?? "USD",
        gatewayInvoiceId: obj.id as string,
        periodStart: period.start,
        periodEnd: period.end,
        planId: sub.planId,
        billingInterval: sub.billingInterval ?? "monthly",
      });

      await recordEvent(sub.orgId, event.id, "PAYMENT_SUCCEEDED", amountPaise);
      break;
    }

    case "invoice.payment_failed": {
      const subId = obj.subscription as string;
      if (!subId) break;

      const sub = await db.subscription.findFirst({
        where: { stripeSubId: subId },
      });
      if (!sub) break;

      await db.subscription.update({
        where: { id: sub.id },
        data: { status: "past_due" },
      });

      await recordEvent(sub.orgId, event.id, "PAYMENT_FAILED");
      break;
    }

    case "customer.subscription.deleted": {
      const subId = obj.id as string;
      const sub = await db.subscription.findFirst({
        where: { stripeSubId: subId },
      });
      if (!sub) break;

      await db.subscription.update({
        where: { id: sub.id },
        data: {
          status: "canceled",
          cancelledAt: new Date(),
          planId: "free",
        },
      });

      await recordEvent(sub.orgId, event.id, "SUBSCRIPTION_CANCELED");
      break;
    }

    case "customer.subscription.paused": {
      const subId = obj.id as string;
      const sub = await db.subscription.findFirst({
        where: { stripeSubId: subId },
      });
      if (!sub) break;

      await db.subscription.update({
        where: { id: sub.id },
        data: { status: "paused", pausedAt: new Date() },
      });

      await recordEvent(sub.orgId, event.id, "SUBSCRIPTION_PAUSED");
      break;
    }

    default:
      // Unhandled event type — log and ignore
      break;
  }
}

async function recordEvent(
  orgId: string,
  gatewayEventId: string,
  type: string,
  amount?: bigint,
): Promise<void> {
  const account = await db.billingAccount.findUnique({ where: { orgId } });
  if (!account) return;

  await db.billingEvent.create({
    data: {
      billingAccountId: account.id,
      type: type as "CHECKOUT_INITIATED",
      gatewayEventId,
      amount: amount ?? null,
      currency: account.currency,
    },
  });

  await logAudit({
    orgId,
    actorId: "system",
    action: "billing.stripe_webhook_processed",
    entityType: "BillingEvent",
    entityId: gatewayEventId,
    metadata: {
      type,
      amountPaise: amount?.toString() ?? null,
      currency: account.currency,
    },
  });
}

function getNextPeriodEnd(interval: string): Date {
  const now = new Date();
  if (interval === "yearly") {
    return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function getStripeInvoicePeriod(obj: Record<string, unknown>): {
  start: Date;
  end: Date;
} {
  const linePeriod = (
    (obj.lines as { data?: Array<{ period?: { start?: number; end?: number } }> } | undefined)
      ?.data?.[0]?.period
  );
  const startSeconds =
    linePeriod?.start ??
    (obj.period_start as number | undefined) ??
    Math.floor(Date.now() / 1000);
  const endSeconds =
    linePeriod?.end ??
    (obj.period_end as number | undefined) ??
    Math.floor(getNextPeriodEnd("monthly").getTime() / 1000);

  return {
    start: new Date(startSeconds * 1000),
    end: new Date(endSeconds * 1000),
  };
}
