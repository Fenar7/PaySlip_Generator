import "server-only";

import { db } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StatementLineItem {
  date: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface StatementData {
  id: string;
  orgId: string;
  customerId: string;
  customerName: string;
  fromDate: Date;
  toDate: Date;
  openingBalance: number;
  closingBalance: number;
  totalInvoiced: number;
  totalReceived: number;
  lineItems: StatementLineItem[];
  generatedAt: Date;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function generateStatement(params: {
  orgId: string;
  customerId: string;
  fromDate: Date;
  toDate: Date;
}): Promise<StatementData> {
  const { orgId, customerId, fromDate, toDate } = params;

  const customer = await db.customer.findFirstOrThrow({
    where: { id: customerId, organizationId: orgId },
    select: { id: true, name: true },
  });

  // Fetch invoices in the date range (using invoiceDate string field in YYYY-MM-DD format)
  const fromDateStr = fromDate.toISOString().split("T")[0];
  const toDateStr = toDate.toISOString().split("T")[0];

  const invoices = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      customerId,
      invoiceDate: { gte: fromDateStr, lte: toDateStr },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    include: {
      payments: {
        where: { status: "SETTLED" },
        orderBy: { paidAt: "asc" },
      },
    },
    orderBy: { invoiceDate: "asc" },
  });

  // Calculate opening balance: sum of unpaid amounts from invoices BEFORE the date range
  const priorInvoices = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      customerId,
      invoiceDate: { lt: fromDateStr },
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    include: {
      payments: {
        where: { status: "SETTLED" },
      },
    },
  });

  let openingBalance = 0;
  for (const inv of priorInvoices) {
    const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    openingBalance += inv.totalAmount - totalPaid;
  }

  // Build line items chronologically
  const events: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
    sortKey: string; // for stable sort: date + type (invoices before payments)
  }> = [];

  let totalInvoiced = 0;
  let totalReceived = 0;

  for (const inv of invoices) {
    events.push({
      date: inv.invoiceDate,
      description: `Invoice ${inv.invoiceNumber}`,
      debit: inv.totalAmount,
      credit: 0,
      sortKey: `${inv.invoiceDate}_0_${inv.invoiceNumber}`,
    });
    totalInvoiced += inv.totalAmount;

    for (const payment of inv.payments) {
      const paidDate = payment.paidAt.toISOString().split("T")[0];
      // Only include payments within the date range
      if (paidDate >= fromDateStr && paidDate <= toDateStr) {
        const methodLabel = payment.method ? ` (${payment.method})` : "";
        events.push({
          date: paidDate,
          description: `Payment — ${inv.invoiceNumber}${methodLabel}`,
          debit: 0,
          credit: payment.amount,
          sortKey: `${paidDate}_1_${inv.invoiceNumber}_${payment.id}`,
        });
        totalReceived += payment.amount;
      }
    }
  }

  // Also include payments from prior invoices that fall within the date range
  for (const inv of priorInvoices) {
    for (const payment of inv.payments) {
      const paidDate = payment.paidAt.toISOString().split("T")[0];
      if (paidDate >= fromDateStr && paidDate <= toDateStr) {
        const methodLabel = payment.method ? ` (${payment.method})` : "";
        events.push({
          date: paidDate,
          description: `Payment — ${inv.invoiceNumber}${methodLabel}`,
          debit: 0,
          credit: payment.amount,
          sortKey: `${paidDate}_1_${inv.invoiceNumber}_${payment.id}`,
        });
        totalReceived += payment.amount;
      }
    }
  }

  events.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  let runningBalance = openingBalance;
  const lineItems: StatementLineItem[] = [];

  for (const evt of events) {
    runningBalance += evt.debit - evt.credit;
    lineItems.push({
      date: evt.date,
      description: evt.description,
      debit: evt.debit,
      credit: evt.credit,
      runningBalance,
    });
  }

  const closingBalance = runningBalance;

  // Upsert the statement record
  const statement = await db.customerStatement.upsert({
    where: {
      id: await findExistingStatementId(orgId, customerId, fromDate, toDate),
    },
    create: {
      orgId,
      customerId,
      fromDate,
      toDate,
      openingBalance,
      closingBalance,
      totalInvoiced,
      totalReceived,
    },
    update: {
      openingBalance,
      closingBalance,
      totalInvoiced,
      totalReceived,
      generatedAt: new Date(),
    },
  });

  return {
    id: statement.id,
    orgId,
    customerId,
    customerName: customer.name,
    fromDate,
    toDate,
    openingBalance,
    closingBalance,
    totalInvoiced,
    totalReceived,
    lineItems,
    generatedAt: statement.generatedAt,
  };
}

export async function getStatementHistory(
  orgId: string,
  customerId: string,
): Promise<
  Array<{
    id: string;
    fromDate: Date;
    toDate: Date;
    openingBalance: number;
    closingBalance: number;
    totalInvoiced: number;
    totalReceived: number;
    fileUrl: string | null;
    generatedAt: Date;
  }>
> {
  return db.customerStatement.findMany({
    where: { orgId, customerId },
    orderBy: { generatedAt: "desc" },
    select: {
      id: true,
      fromDate: true,
      toDate: true,
      openingBalance: true,
      closingBalance: true,
      totalInvoiced: true,
      totalReceived: true,
      fileUrl: true,
      generatedAt: true,
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function findExistingStatementId(
  orgId: string,
  customerId: string,
  fromDate: Date,
  toDate: Date,
): Promise<string> {
  const existing = await db.customerStatement.findFirst({
    where: { orgId, customerId, fromDate, toDate },
    select: { id: true },
  });
  // Return a non-existent id to force a create when no match
  return existing?.id ?? "___nonexistent___";
}
