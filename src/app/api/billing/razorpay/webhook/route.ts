import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import {
  getInternalPlanIdForRazorpayPlanId,
  recordRazorpayEvent,
  updateSubscriptionFromWebhook,
} from "@/lib/billing";
import { handlePaymentLinkPaid } from "@/lib/payment-links";
import { handleVirtualAccountCredited } from "@/lib/smart-collect";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(body, signature)) {
    console.warn("[Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);
  const eventId: string = event.event_id ?? event.id ?? crypto.randomUUID();
  const eventType: string = event.event;

  const isNew = await recordRazorpayEvent(eventId, eventType, event);
  if (!isNew) {
    return NextResponse.json({ status: "already_processed" });
  }

  try {
    const subscription = event.payload?.subscription?.entity;
    const razorpaySubId: string | undefined = subscription?.id;
    const internalPlanId = getInternalPlanIdForRazorpayPlanId(
      subscription?.plan_id,
    );

    switch (eventType) {
      case "subscription.activated": {
        if (razorpaySubId) {
          const updated = await updateSubscriptionFromWebhook({
            razorpaySubId,
            status: "active",
            ...(internalPlanId ? { planId: internalPlanId } : {}),
            ...(subscription.customer_id
              ? { razorpayCustomerId: subscription.customer_id }
              : {}),
            ...(subscription.plan_id
              ? { razorpayPlanId: subscription.plan_id }
              : {}),
            currentPeriodStart: subscription.current_start
              ? new Date(subscription.current_start * 1000)
              : undefined,
            currentPeriodEnd: subscription.current_end
              ? new Date(subscription.current_end * 1000)
              : undefined,
          });
          await logAudit({
            orgId: updated.orgId,
            actorId: "system",
            action: "billing.razorpay_subscription_activated",
            entityType: "Subscription",
            entityId: updated.id,
            metadata: { eventId, razorpaySubId },
          });
        }
        break;
      }

      case "subscription.charged": {
        if (razorpaySubId) {
          const updated = await updateSubscriptionFromWebhook({
            razorpaySubId,
            status: "active",
            ...(internalPlanId ? { planId: internalPlanId } : {}),
            ...(subscription.customer_id
              ? { razorpayCustomerId: subscription.customer_id }
              : {}),
            ...(subscription.plan_id
              ? { razorpayPlanId: subscription.plan_id }
              : {}),
            currentPeriodStart: subscription.current_start
              ? new Date(subscription.current_start * 1000)
              : undefined,
            currentPeriodEnd: subscription.current_end
              ? new Date(subscription.current_end * 1000)
              : undefined,
          });
          await logAudit({
            orgId: updated.orgId,
            actorId: "system",
            action: "billing.razorpay_subscription_charged",
            entityType: "Subscription",
            entityId: updated.id,
            metadata: { eventId, razorpaySubId },
          });
        }
        break;
      }

      case "subscription.pending": {
        if (razorpaySubId) {
          const updated = await updateSubscriptionFromWebhook({
            razorpaySubId,
            status: "pending",
            ...(subscription.customer_id
              ? { razorpayCustomerId: subscription.customer_id }
              : {}),
            ...(subscription.plan_id
              ? { razorpayPlanId: subscription.plan_id }
              : {}),
          });
          await logAudit({
            orgId: updated.orgId,
            actorId: "system",
            action: "billing.razorpay_subscription_pending",
            entityType: "Subscription",
            entityId: updated.id,
            metadata: { eventId, razorpaySubId },
          });
        }
        break;
      }

      case "subscription.halted": {
        if (razorpaySubId) {
          const updated = await updateSubscriptionFromWebhook({
            razorpaySubId,
            status: "expired",
          });
          await logAudit({
            orgId: updated.orgId,
            actorId: "system",
            action: "billing.razorpay_subscription_halted",
            entityType: "Subscription",
            entityId: updated.id,
            metadata: { eventId, razorpaySubId },
          });
        }
        break;
      }

      case "subscription.cancelled": {
        if (razorpaySubId) {
          const updated = await updateSubscriptionFromWebhook({
            razorpaySubId,
            status: "cancelled",
            cancelledAt: new Date(),
          });
          await logAudit({
            orgId: updated.orgId,
            actorId: "system",
            action: "billing.razorpay_subscription_cancelled",
            entityType: "Subscription",
            entityId: updated.id,
            metadata: { eventId, razorpaySubId },
          });
        }
        break;
      }

      case "subscription.paused": {
        if (razorpaySubId) {
          const updated = await updateSubscriptionFromWebhook({
            razorpaySubId,
            status: "paused",
          });
          await logAudit({
            orgId: updated.orgId,
            actorId: "system",
            action: "billing.razorpay_subscription_paused",
            entityType: "Subscription",
            entityId: updated.id,
            metadata: { eventId, razorpaySubId },
          });
        }
        break;
      }

      case "subscription.resumed": {
        if (razorpaySubId) {
          const updated = await updateSubscriptionFromWebhook({
            razorpaySubId,
            status: "active",
          });
          await logAudit({
            orgId: updated.orgId,
            actorId: "system",
            action: "billing.razorpay_subscription_resumed",
            entityType: "Subscription",
            entityId: updated.id,
            metadata: { eventId, razorpaySubId },
          });
        }
        break;
      }

      case "payment.captured": {
        const payment = event.payload?.payment?.entity;
        console.info(
          `[Webhook] Payment captured: ${payment?.id} — ₹${(payment?.amount ?? 0) / 100}`,
        );
        break;
      }

      case "payment.failed": {
        const payment = event.payload?.payment?.entity;
        console.error(
          `[Webhook] Payment failed: ${payment?.id} — ${payment?.error_description}`,
        );
        break;
      }

      case "payment_link.paid": {
        const paymentLink = event.payload?.payment_link?.entity;
        const payment = event.payload?.payment?.entity;
        if (paymentLink?.id && payment?.id) {
          await handlePaymentLinkPaid(
            paymentLink.id,
            payment.id,
            payment.amount ?? 0,
          );
        }
        break;
      }

      case "virtual_account.credited": {
        const va = event.payload?.virtual_account?.entity;
        const payment = event.payload?.payment?.entity;
        if (va?.id && payment?.id) {
          await handleVirtualAccountCredited(va.id, payment.amount ?? 0, {
            payerName: payment.bank_account?.name,
            payerAccount: payment.bank_account?.account_number,
            payerIfsc: payment.bank_account?.ifsc,
            razorpayPaymentId: payment.id,
          });
        }
        break;
      }

      default:
        console.info(`[Webhook] Unhandled event: ${eventType}`);
    }
  } catch (error) {
    console.error(`[Webhook] Error processing ${eventType}:`, error);
  }

  return NextResponse.json({ status: "ok" });
}
