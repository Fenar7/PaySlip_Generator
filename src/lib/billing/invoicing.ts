/**
 * Phase 28.1: Subscription Invoice Generator
 *
 * Auto-generates tax-inclusive Slipwise-branded invoices for every
 * successful subscription payment. Invoices are stored as BillingInvoice
 * records tied to the organization.
 */

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { getCurrentPeriod } from "./metering";

const TAX_RATE_BASIS_POINTS: Record<string, number> = {
  IN: 1800,
  GB: 2000,
  EU: 2000,
  US: 0,
  DEFAULT: 0,
};

/**
 * Generate a subscription invoice after a successful payment event.
 */
export async function generateSubscriptionInvoice(params: {
  orgId: string;
  amountPaise: bigint;
  currency: string;
  gatewayInvoiceId: string;
  periodStart: Date;
  periodEnd: Date;
  planId: string;
  billingInterval: string;
}): Promise<string> {
  const { orgId, amountPaise, currency, gatewayInvoiceId, periodStart, periodEnd, planId, billingInterval } = params;

  // Idempotency: check if invoice already exists for this gateway invoice
  const existing = await db.billingInvoice.findFirst({
    where: { orgId, razorpayInvoiceId: gatewayInvoiceId },
  });
  if (existing) return existing.id;

  // Determine tax rate based on billing country
  const account = await db.billingAccount.findUnique({
    where: { orgId },
    select: { billingCountry: true },
  });
  const breakdown = getBillingTaxBreakdown(
    amountPaise,
    account?.billingCountry,
  );

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(orgId);

  const invoice = await db.billingInvoice.create({
    data: {
      orgId,
      razorpayInvoiceId: gatewayInvoiceId,
      planId,
      amountPaise,
      currency,
      periodStart,
      periodEnd,
      status: "paid",
    },
  });

  await db.billingInvoice.update({
    where: { id: invoice.id },
    data: { pdfUrl: buildBillingInvoicePdfUrl(invoice.id) },
  });

  // Record billing event
  const billingAccount = await db.billingAccount.findUnique({ where: { orgId } });
  if (billingAccount) {
    await db.billingEvent.create({
      data: {
        billingAccountId: billingAccount.id,
        type: "INVOICE_GENERATED",
        gatewayEventId: `inv_${invoice.id}`,
        amount: amountPaise,
        currency,
        metadata: JSON.parse(JSON.stringify({
          invoiceNumber,
          planId,
          billingInterval,
          baseAmountPaise: breakdown.baseAmountPaise.toString(),
          taxAmountPaise: breakdown.taxAmountPaise.toString(),
          taxRateBasisPoints: breakdown.taxRateBasisPoints,
          country: breakdown.country,
        })),
      },
    });
  }

  return invoice.id;
}

export function buildBillingInvoicePdfUrl(invoiceId: string): string {
  return `/api/billing/invoices/${invoiceId}/pdf`;
}

export function formatBillingInvoiceNumber(invoice: {
  id: string;
  orgId: string;
  createdAt: Date;
}): string {
  const year = invoice.createdAt.getUTCFullYear();
  const orgShort = invoice.orgId.slice(0, 6).toUpperCase();
  const suffix = invoice.id.slice(-6).toUpperCase();
  return `SLW-${year}-${orgShort}-${suffix}`;
}

export function getBillingTaxBreakdown(
  amountPaise: bigint,
  billingCountry?: string | null,
): {
  baseAmountPaise: bigint;
  taxAmountPaise: bigint;
  taxRateBasisPoints: number;
  country: string;
} {
  const country = (billingCountry ?? "DEFAULT").toUpperCase();
  const taxRateBasisPoints =
    TAX_RATE_BASIS_POINTS[country] ?? TAX_RATE_BASIS_POINTS.DEFAULT;

  if (taxRateBasisPoints <= 0) {
    return {
      baseAmountPaise: amountPaise,
      taxAmountPaise: BigInt(0),
      taxRateBasisPoints,
      country,
    };
  }

  const denominator = BigInt(10000 + taxRateBasisPoints);
  const baseAmountPaise = (amountPaise * BigInt(10000)) / denominator;

  return {
    baseAmountPaise,
    taxAmountPaise: amountPaise - baseAmountPaise,
    taxRateBasisPoints,
    country,
  };
}

/**
 * Generate a sequential invoice number for the org.
 * Format: SLW-{YYYY}-{ORG_SHORT}-{SEQ}
 */
async function generateInvoiceNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const orgShort = orgId.substring(0, 6).toUpperCase();

  const count = await db.billingInvoice.count({
    where: { orgId },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `SLW-${year}-${orgShort}-${seq}`;
}

/**
 * List billing invoices for the current org.
 */
export async function listBillingInvoices(page: number = 1, pageSize: number = 20) {
  const { orgId } = await requireOrgContext();

  const [invoices, total] = await Promise.all([
    db.billingInvoice.findMany({
      where: { orgId },
      orderBy: { periodStart: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.billingInvoice.count({ where: { orgId } }),
  ]);

  return { invoices, total, page, pageSize };
}

/**
 * Generate overage invoice at period end.
 * Called after metering calculates total overage.
 */
export async function generateOverageInvoice(
  orgId: string,
  overageAmountPaise: bigint,
): Promise<string | null> {
  if (overageAmountPaise <= BigInt(0)) return null;

  const { periodMonth } = getCurrentPeriod();
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const account = await db.billingAccount.findUnique({
    where: { orgId },
    select: { currency: true },
  });

  return generateSubscriptionInvoice({
    orgId,
    amountPaise: overageAmountPaise,
    currency: account?.currency ?? "INR",
    gatewayInvoiceId: `overage_${orgId}_${periodMonth}`,
    periodStart,
    periodEnd,
    planId: "overage",
    billingInterval: "monthly",
  });
}
