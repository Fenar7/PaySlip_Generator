"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  getPortalSession,
  requestMagicLink,
} from "@/lib/portal-auth";

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await getPortalSession();
  if (!session) redirect("/portal");
  return session;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// ─── 1. Request Magic Link ─────────────────────────────────────────────────────

export async function requestPortalMagicLink(email: string, orgSlug: string) {
  // Always return same shape to prevent email enumeration
  try {
    await requestMagicLink(email, orgSlug);
  } catch {
    // Swallow errors — anti-enumeration
  }
  return {
    success: true,
    message:
      "If an account exists with that email, we've sent a login link. Please check your inbox.",
  };
}

// ─── 2. Get Portal Invoices ────────────────────────────────────────────────────

export async function getPortalInvoices(orgSlug: string) {
  const session = await requireSession();

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org || org.id !== session.orgId) {
    throw new Error("Unauthorized");
  }

  const invoices = await db.invoice.findMany({
    where: {
      organizationId: session.orgId,
      customerId: session.customerId,
      status: { not: "DRAFT" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      dueDate: true,
      totalAmount: true,
      amountPaid: true,
      remainingAmount: true,
      status: true,
    },
  });

  return invoices;
}

// ─── 3. Get Single Invoice Detail (with IDOR check) ───────────────────────────

export async function getPortalInvoiceDetail(
  orgSlug: string,
  invoiceId: string,
) {
  const session = await requireSession();

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org || org.id !== session.orgId) {
    throw new Error("Unauthorized");
  }

  const invoice = await db.invoice.findFirst({
    where: {
      id: invoiceId,
      organizationId: session.orgId,
      customerId: session.customerId,
    },
    include: {
      lineItems: true,
      payments: {
        orderBy: { paidAt: "desc" },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          method: true,
          note: true,
          paymentMethodDisplay: true,
        },
      },
      organization: { select: { name: true } },
      customer: {
        select: { name: true, email: true, phone: true },
      },
    },
  });

  if (!invoice) return null;

  // Log portal access
  await db.customerPortalAccessLog.create({
    data: {
      orgId: session.orgId,
      customerId: session.customerId,
      path: `/portal/${orgSlug}/invoices/${invoiceId}`,
    },
  });

  return invoice;
}

// ─── 4. Generate Statement ─────────────────────────────────────────────────────

export async function generatePortalStatement(
  orgSlug: string,
  fromDate: string,
  toDate: string,
) {
  const session = await requireSession();

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org || org.id !== session.orgId) {
    throw new Error("Unauthorized");
  }

  const from = new Date(fromDate);
  const to = new Date(toDate);

  // Get invoices in the period
  const invoices = await db.invoice.findMany({
    where: {
      organizationId: session.orgId,
      customerId: session.customerId,
      status: { not: "DRAFT" },
      createdAt: { gte: from, lte: to },
    },
    select: { totalAmount: true, amountPaid: true },
  });

  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalReceived = invoices.reduce((s, i) => s + i.amountPaid, 0);

  // Opening balance: sum of remaining amounts for invoices BEFORE the period
  const olderInvoices = await db.invoice.findMany({
    where: {
      organizationId: session.orgId,
      customerId: session.customerId,
      status: { not: "DRAFT" },
      createdAt: { lt: from },
    },
    select: { remainingAmount: true },
  });
  const openingBalance = olderInvoices.reduce(
    (s, i) => s + i.remainingAmount,
    0,
  );
  const closingBalance = openingBalance + totalInvoiced - totalReceived;

  const statement = await db.customerStatement.create({
    data: {
      orgId: session.orgId,
      customerId: session.customerId,
      fromDate: from,
      toDate: to,
      openingBalance,
      closingBalance,
      totalInvoiced,
      totalReceived,
    },
  });

  // Log portal access
  await db.customerPortalAccessLog.create({
    data: {
      orgId: session.orgId,
      customerId: session.customerId,
      path: `/portal/${orgSlug}/statements`,
    },
  });

  return {
    id: statement.id,
    fromDate: statement.fromDate.toISOString(),
    toDate: statement.toDate.toISOString(),
    openingBalance,
    closingBalance,
    totalInvoiced,
    totalReceived,
    formattedOpeningBalance: formatCurrency(openingBalance),
    formattedClosingBalance: formatCurrency(closingBalance),
    formattedTotalInvoiced: formatCurrency(totalInvoiced),
    formattedTotalReceived: formatCurrency(totalReceived),
  };
}

// ─── 5. Update Profile ─────────────────────────────────────────────────────────

export async function updatePortalProfile(
  orgSlug: string,
  data: { phone?: string; address?: string },
) {
  const session = await requireSession();

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org || org.id !== session.orgId) {
    throw new Error("Unauthorized");
  }

  await db.customer.update({
    where: {
      id: session.customerId,
      organizationId: session.orgId,
    },
    data: {
      phone: data.phone,
      address: data.address,
    },
  });

  await db.customerPortalAccessLog.create({
    data: {
      orgId: session.orgId,
      customerId: session.customerId,
      path: `/portal/${orgSlug}/profile/update`,
    },
  });

  return { success: true };
}

// ─── 6. Initiate Payment ───────────────────────────────────────────────────────

export async function initiatePortalPayment(
  orgSlug: string,
  invoiceId: string,
) {
  const session = await requireSession();

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org || org.id !== session.orgId) {
    throw new Error("Unauthorized");
  }

  // IDOR check: invoice must belong to this customer + org
  const invoice = await db.invoice.findFirst({
    where: {
      id: invoiceId,
      organizationId: session.orgId,
      customerId: session.customerId,
    },
    select: {
      id: true,
      razorpayPaymentLinkUrl: true,
      paymentLinkExpiresAt: true,
      remainingAmount: true,
      status: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status === "PAID") {
    return { alreadyPaid: true, url: null };
  }

  // Return existing payment link if still valid
  if (
    invoice.razorpayPaymentLinkUrl &&
    invoice.paymentLinkExpiresAt &&
    invoice.paymentLinkExpiresAt > new Date()
  ) {
    return { alreadyPaid: false, url: invoice.razorpayPaymentLinkUrl };
  }

  // Otherwise, the UI should direct to the public invoice page for payment
  const publicToken = await db.publicInvoiceToken.findFirst({
    where: { invoiceId: invoice.id },
    select: { token: true },
  });

  await db.customerPortalAccessLog.create({
    data: {
      orgId: session.orgId,
      customerId: session.customerId,
      path: `/portal/${orgSlug}/invoices/${invoiceId}/pay`,
    },
  });

  return {
    alreadyPaid: false,
    url: publicToken ? `/invoice/${publicToken.token}` : null,
  };
}
