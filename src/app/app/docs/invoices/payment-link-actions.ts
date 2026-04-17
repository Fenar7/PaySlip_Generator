"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getOrgRazorpayClient } from "@/lib/razorpay/client";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

const PAYABLE_STATUSES = new Set(["ISSUED", "DUE", "OVERDUE", "PARTIALLY_PAID"]);
const BULK_LIMIT = 50;
const BULK_CONCURRENCY = 3;

export async function createPaymentLink(
  invoiceId: string
): Promise<ActionResult<{ paymentLinkUrl: string; paymentLinkId: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId, archivedAt: null },
      include: { customer: true },
    });

    if (!invoice) return { success: false, error: "Invoice not found." };
    if (!PAYABLE_STATUSES.has(invoice.status)) {
      return {
        success: false,
        error: `Cannot create a payment link for an invoice with status: ${invoice.status}.`,
      };
    }

    // Idempotent: return existing valid link if present
    if (
      invoice.razorpayPaymentLinkUrl &&
      invoice.paymentLinkStatus &&
      ["created", "partially_paid"].includes(invoice.paymentLinkStatus) &&
      (!invoice.paymentLinkExpiresAt || invoice.paymentLinkExpiresAt > new Date())
    ) {
      return {
        success: true,
        data: {
          paymentLinkUrl: invoice.razorpayPaymentLinkUrl,
          paymentLinkId: invoice.razorpayPaymentLinkId!,
        },
      };
    }

    const razorpay = await getOrgRazorpayClient(orgId);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.slipwise.in";

    // Amount in paise (Razorpay uses smallest currency unit)
    const amountPaise = Math.round((invoice.remainingAmount || invoice.totalAmount) * 100);

    // The Razorpay SDK create() has conflicting overloads — cast to any to bypass TS confusion.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createPaymentLinkFn = razorpay.paymentLink.create.bind(razorpay.paymentLink) as (p: any) => Promise<{
      id: string;
      short_url: string;
      status: string;
      expire_by: number | null;
    }>;

    const createParams: Record<string, unknown> = {
      amount: amountPaise,
      currency: "INR",
      description: `Invoice ${invoice.invoiceNumber}`,
      notify: {
        sms: !!invoice.customer?.phone,
        email: !!invoice.customer?.email,
      },
      reminder_enable: true,
      callback_url: `${appUrl}/invoice/${invoiceId}/payment-success`,
      callback_method: "get",
      // PRD §5.2: payment links expire 30 days from creation
      expire_by: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };
    if (invoice.customer) {
      createParams.customer = {
        name: invoice.customer.name,
        ...(invoice.customer.email ? { email: invoice.customer.email } : {}),
        ...(invoice.customer.phone ? { contact: invoice.customer.phone } : {}),
      };
    }

    const link = await createPaymentLinkFn(createParams);

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        razorpayPaymentLinkId: link.id,
        razorpayPaymentLinkUrl: link.short_url,
        paymentLinkStatus: link.status ?? "created",
        paymentLinkExpiresAt: link.expire_by ? new Date(link.expire_by * 1000) : null,
        paymentLinkLastEventAt: new Date(),
      },
    });

    revalidatePath(`/app/docs/invoices/${invoiceId}`);

    return {
      success: true,
      data: { paymentLinkUrl: link.short_url, paymentLinkId: link.id },
    };
  } catch (err) {
    console.error("[createPaymentLink]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Failed to create payment link: ${message}` };
  }
}

export async function cancelPaymentLink(
  invoiceId: string
): Promise<ActionResult<void>> {
  try {
    const { orgId } = await requireRole("admin");

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId, archivedAt: null },
      select: {
        id: true,
        razorpayPaymentLinkId: true,
        paymentLinkStatus: true,
      },
    });

    if (!invoice) return { success: false, error: "Invoice not found." };
    if (!invoice.razorpayPaymentLinkId) {
      return { success: false, error: "No payment link exists for this invoice." };
    }
    if (invoice.paymentLinkStatus === "cancelled") {
      return { success: true, data: undefined }; // idempotent
    }

    const razorpay = await getOrgRazorpayClient(orgId);
    await razorpay.paymentLink.cancel(invoice.razorpayPaymentLinkId);

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentLinkStatus: "cancelled",
        paymentLinkLastEventAt: new Date(),
      },
    });

    revalidatePath(`/app/docs/invoices/${invoiceId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[cancelPaymentLink]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Failed to cancel payment link: ${message}` };
  }
}

export async function bulkCreatePaymentLinks(
  invoiceIds: string[]
): Promise<ActionResult<{ succeeded: number; failed: number; errors: string[] }>> {
  try {
    const { orgId } = await requireRole("admin");

    if (invoiceIds.length === 0) {
      return { success: false, error: "No invoices selected." };
    }
    if (invoiceIds.length > BULK_LIMIT) {
      return {
        success: false,
        error: `Bulk payment links are limited to ${BULK_LIMIT} invoices per batch.`,
      };
    }

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches of BULK_CONCURRENCY
    for (let i = 0; i < invoiceIds.length; i += BULK_CONCURRENCY) {
      const batch = invoiceIds.slice(i, i + BULK_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((id) => createPaymentLink(id))
      );
      for (const result of results) {
        if (result.status === "fulfilled" && result.value.success) {
          succeeded++;
        } else {
          failed++;
          const msg =
            result.status === "rejected"
              ? String(result.reason)
              : !result.value.success
              ? result.value.error
              : "Unknown error";
          errors.push(msg);
        }
      }
    }

    revalidatePath("/app/pay/receivables");
    return { success: true, data: { succeeded, failed, errors } };
  } catch (err) {
    console.error("[bulkCreatePaymentLinks]", err);
    return { success: false, error: "Bulk operation failed." };
  }
}

export async function getInvoicePaymentLinkStatus(
  invoiceId: string
): Promise<
  ActionResult<{
    paymentLinkId: string | null;
    paymentLinkUrl: string | null;
    paymentLinkStatus: string | null;
    paymentLinkExpiresAt: string | null;
  }>
> {
  try {
    const { orgId } = await requireOrgContext();

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      select: {
        razorpayPaymentLinkId: true,
        razorpayPaymentLinkUrl: true,
        paymentLinkStatus: true,
        paymentLinkExpiresAt: true,
      },
    });

    if (!invoice) return { success: false, error: "Invoice not found." };

    return {
      success: true,
      data: {
        paymentLinkId: invoice.razorpayPaymentLinkId,
        paymentLinkUrl: invoice.razorpayPaymentLinkUrl,
        paymentLinkStatus: invoice.paymentLinkStatus,
        paymentLinkExpiresAt: invoice.paymentLinkExpiresAt?.toISOString() ?? null,
      },
    };
  } catch (err) {
    console.error("[getInvoicePaymentLinkStatus]", err);
    return { success: false, error: "Failed to fetch payment link status." };
  }
}
