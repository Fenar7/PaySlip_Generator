import "server-only";

import crypto from "crypto";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import type { Prisma } from "@/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuoteLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount?: number;
  sortOrder?: number;
}

export interface CreateQuoteParams {
  orgId: string;
  userId: string;
  customerId: string;
  title: string;
  issueDate?: Date;
  validUntil?: Date;
  currency?: string;
  notes?: string;
  termsAndConditions?: string;
  templateId?: string;
  discountAmount?: number;
  lineItems: QuoteLineItemInput[];
}

export interface UpdateQuoteParams {
  title?: string;
  customerId?: string;
  issueDate?: Date;
  validUntil?: Date;
  currency?: string;
  notes?: string;
  termsAndConditions?: string;
  templateId?: string;
  discountAmount?: number;
  lineItems?: QuoteLineItemInput[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateTotals(lineItems: QuoteLineItemInput[], discountAmount: number = 0) {
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of lineItems) {
    const lineSubtotal = item.quantity * item.unitPrice;
    const lineTax = lineSubtotal * (item.taxRate / 100);
    subtotal += lineSubtotal;
    taxAmount += lineTax;
  }

  const totalAmount = subtotal + taxAmount - discountAmount;
  return { subtotal, taxAmount, totalAmount: Math.max(totalAmount, 0) };
}

function lineItemAmount(item: QuoteLineItemInput): number {
  return item.quantity * item.unitPrice * (1 + item.taxRate / 100);
}

// ─── Generate Quote Number ────────────────────────────────────────────────────

export async function generateQuoteNumber(orgId: string): Promise<string> {
  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    let defaults = await tx.orgDefaults.findUnique({
      where: { organizationId: orgId },
    });

    if (!defaults) {
      defaults = await tx.orgDefaults.create({
        data: { organizationId: orgId },
      });
    }

    const prefix = defaults.quotePrefix;
    const counter = defaults.quoteCounter;

    await tx.orgDefaults.update({
      where: { organizationId: orgId },
      data: { quoteCounter: counter + 1 },
    });

    return { prefix, counter };
  });

  const padded = result.counter.toString().padStart(5, "0");
  return `${result.prefix}-${padded}`;
}

// ─── Create Quote ─────────────────────────────────────────────────────────────

export async function createQuote(params: CreateQuoteParams) {
  const {
    orgId,
    userId,
    customerId,
    title,
    lineItems,
    discountAmount = 0,
  } = params;

  // Validate customer exists and belongs to org
  const customer = await db.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
  });
  if (!customer) {
    throw new Error("Customer not found or does not belong to this organization");
  }

  if (!lineItems || lineItems.length === 0) {
    throw new Error("At least one line item is required");
  }

  // Get org defaults for validity days
  const orgDefaults = await db.orgDefaults.findUnique({
    where: { organizationId: orgId },
  });
  const validityDays = orgDefaults?.quoteValidityDays ?? 14;

  const quoteNumber = await generateQuoteNumber(orgId);
  const { subtotal, taxAmount, totalAmount } = calculateTotals(lineItems, discountAmount);
  const publicToken = crypto.randomBytes(32).toString("hex");

  const issueDate = params.issueDate ?? new Date();
  const validUntil =
    params.validUntil ?? new Date(issueDate.getTime() + validityDays * 24 * 60 * 60 * 1000);

  const quote = await db.quote.create({
    data: {
      orgId,
      customerId,
      quoteNumber,
      title,
      status: "DRAFT",
      issueDate,
      validUntil,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      currency: params.currency ?? "INR",
      notes: params.notes ?? null,
      termsAndConditions: params.termsAndConditions ?? null,
      templateId: params.templateId ?? null,
      publicToken,
      createdBy: userId,
      lineItems: {
        create: lineItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          amount: lineItemAmount(item),
          sortOrder: item.sortOrder ?? index,
        })),
      },
    },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      customer: true,
    },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "quote_created",
    entityType: "Quote",
    entityId: quote.id,
    metadata: { quoteNumber, customerId, totalAmount },
  });

  return quote;
}

// ─── Update Quote ─────────────────────────────────────────────────────────────

export async function updateQuote(
  quoteId: string,
  orgId: string,
  userId: string,
  params: UpdateQuoteParams
) {
  const existing = await db.quote.findFirst({
    where: { id: quoteId, orgId },
  });

  if (!existing) {
    throw new Error("Quote not found");
  }

  if (existing.status !== "DRAFT") {
    throw new Error("Only draft quotes can be edited");
  }

  if (params.customerId) {
    const customer = await db.customer.findFirst({
      where: { id: params.customerId, organizationId: orgId },
    });
    if (!customer) {
      throw new Error("Customer not found or does not belong to this organization");
    }
  }

  let subtotal = existing.subtotal;
  let taxAmount = existing.taxAmount;
  let totalAmount = existing.totalAmount;
  const discountAmount = params.discountAmount ?? existing.discountAmount;

  if (params.lineItems) {
    if (params.lineItems.length === 0) {
      throw new Error("At least one line item is required");
    }
    const totals = calculateTotals(params.lineItems, discountAmount);
    subtotal = totals.subtotal;
    taxAmount = totals.taxAmount;
    totalAmount = totals.totalAmount;
  }

  const quote = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    if (params.lineItems) {
      await tx.quoteLineItem.deleteMany({ where: { quoteId } });
      await tx.quoteLineItem.createMany({
        data: params.lineItems.map((item, index) => ({
          quoteId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          amount: lineItemAmount(item),
          sortOrder: item.sortOrder ?? index,
        })),
      });
    }

    return tx.quote.update({
      where: { id: quoteId },
      data: {
        ...(params.title !== undefined && { title: params.title }),
        ...(params.customerId !== undefined && { customerId: params.customerId }),
        ...(params.issueDate !== undefined && { issueDate: params.issueDate }),
        ...(params.validUntil !== undefined && { validUntil: params.validUntil }),
        ...(params.currency !== undefined && { currency: params.currency }),
        ...(params.notes !== undefined && { notes: params.notes }),
        ...(params.termsAndConditions !== undefined && {
          termsAndConditions: params.termsAndConditions,
        }),
        ...(params.templateId !== undefined && { templateId: params.templateId }),
        discountAmount,
        subtotal,
        taxAmount,
        totalAmount,
      },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        customer: true,
      },
    });
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "quote_updated",
    entityType: "Quote",
    entityId: quoteId,
  });

  return quote;
}

// ─── Send Quote ───────────────────────────────────────────────────────────────

export async function sendQuote(quoteId: string, orgId: string, userId: string) {
  const quote = await db.quote.findFirst({
    where: { id: quoteId, orgId },
    include: { customer: true, org: true },
  });

  if (!quote) {
    throw new Error("Quote not found");
  }

  if (quote.status !== "DRAFT") {
    throw new Error("Only draft quotes can be sent");
  }

  const updated = await db.quote.update({
    where: { id: quoteId },
    data: {
      status: "SENT",
      issueDate: quote.issueDate ?? new Date(),
    },
  });

  // Send email to customer if they have an email
  if (quote.customer.email) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.slipwise.app";
    const quoteUrl = `${baseUrl}/quote/${quote.publicToken}`;

    await sendEmail({
      to: quote.customer.email,
      subject: `Quote ${quote.quoteNumber} from ${quote.org.name}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;">You have a new quote</h1>
          <p style="color: #555; margin-bottom: 8px;">Hi ${quote.customer.name},</p>
          <p style="color: #555; margin-bottom: 24px;">${quote.org.name} has sent you a quote (<strong>${quote.quoteNumber}</strong>) for review.</p>
          <a href="${quoteUrl}" style="display: inline-block; background: #dc2626; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Quote</a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">This quote is valid until ${updated.validUntil.toLocaleDateString("en-IN")}.</p>
        </div>
      `,
    });
  }

  await logAudit({
    orgId,
    actorId: userId,
    action: "quote_sent",
    entityType: "Quote",
    entityId: quoteId,
    metadata: { quoteNumber: quote.quoteNumber, customerEmail: quote.customer.email },
  });

  return updated;
}

// ─── Accept Quote (public, token-based) ───────────────────────────────────────

export async function acceptQuote(quoteId: string, publicToken: string) {
  const quote = await db.quote.findFirst({
    where: { id: quoteId },
  });

  if (!quote) {
    throw new Error("Quote not found");
  }

  if (quote.publicToken !== publicToken) {
    throw new Error("Invalid token");
  }

  if (quote.status !== "SENT") {
    throw new Error(`Quote cannot be accepted in ${quote.status} status`);
  }

  if (quote.validUntil < new Date()) {
    throw new Error("This quote has expired");
  }

  const updated = await db.quote.update({
    where: { id: quoteId },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });

  await logAudit({
    orgId: quote.orgId,
    actorId: "public",
    action: "quote_accepted",
    entityType: "Quote",
    entityId: quoteId,
  });

  return updated;
}

// ─── Decline Quote (public, token-based) ──────────────────────────────────────

export async function declineQuote(quoteId: string, publicToken: string, reason?: string) {
  const quote = await db.quote.findFirst({
    where: { id: quoteId },
  });

  if (!quote) {
    throw new Error("Quote not found");
  }

  if (quote.publicToken !== publicToken) {
    throw new Error("Invalid token");
  }

  if (quote.status !== "SENT") {
    throw new Error(`Quote cannot be declined in ${quote.status} status`);
  }

  const updated = await db.quote.update({
    where: { id: quoteId },
    data: {
      status: "DECLINED",
      declinedAt: new Date(),
      declineReason: reason ?? null,
    },
  });

  await logAudit({
    orgId: quote.orgId,
    actorId: "public",
    action: "quote_declined",
    entityType: "Quote",
    entityId: quoteId,
    metadata: { reason: reason ?? null },
  });

  return updated;
}

// ─── Convert Quote to Invoice ─────────────────────────────────────────────────

export async function convertQuoteToInvoice(quoteId: string, orgId: string, userId: string) {
  const quote = await db.quote.findFirst({
    where: { id: quoteId, orgId },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!quote) {
    throw new Error("Quote not found");
  }

  // Idempotent: if already converted, return existing invoice
  if (quote.convertedInvoiceId) {
    const existingInvoice = await db.invoice.findUnique({
      where: { id: quote.convertedInvoiceId },
    });
    if (existingInvoice) {
      return existingInvoice;
    }
  }

  if (quote.status !== "ACCEPTED") {
    throw new Error("Only accepted quotes can be converted to invoices");
  }

  // Import nextDocumentNumber inline to avoid circular deps
  const { nextDocumentNumber } = await import("@/lib/docs");

  const invoice = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const invoiceNumber = await nextDocumentNumber(orgId, "invoice");

    const newInvoice = await tx.invoice.create({
      data: {
        organizationId: orgId,
        customerId: quote.customerId,
        invoiceNumber,
        invoiceDate: new Date().toISOString().split("T")[0],
        status: "DRAFT",
        totalAmount: quote.totalAmount,
        notes: quote.notes,
        formData: {},
        lineItems: {
          create: quote.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discount: 0,
            amount: item.amount,
            sortOrder: item.sortOrder,
          })),
        },
      },
    });

    await tx.quote.update({
      where: { id: quoteId },
      data: {
        status: "CONVERTED",
        convertedInvoiceId: newInvoice.id,
      },
    });

    return newInvoice;
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "quote_converted",
    entityType: "Quote",
    entityId: quoteId,
    metadata: { invoiceId: invoice.id },
  });

  return invoice;
}

// ─── Expire Overdue Quotes ────────────────────────────────────────────────────

export async function expireOverdueQuotes(): Promise<{ expired: number }> {
  const now = new Date();

  const result = await db.quote.updateMany({
    where: {
      status: "SENT",
      validUntil: { lt: now },
    },
    data: {
      status: "EXPIRED",
    },
  });

  return { expired: result.count };
}
