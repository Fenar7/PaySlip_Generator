"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { generateCSV } from "@/lib/csv";

const UNPAID_STATUSES = ["ISSUED", "VIEWED", "DUE", "PARTIALLY_PAID", "OVERDUE"];

export interface ReceivablesRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  daysOverdue: number | null;
}

export interface AgingBucket {
  label: string;
  count: number;
  total: number;
  invoices: ReceivablesRow[];
}

export interface ReceivablesAgingResult {
  buckets: AgingBucket[];
  grandTotal: number;
}

export async function getReceivablesAging(filters: {
  customerId?: string;
}): Promise<ReceivablesAgingResult> {
  const { orgId } = await requireOrgContext();

  const where: Record<string, unknown> = {
    organizationId: orgId,
    archivedAt: null,
    status: { in: UNPAID_STATUSES },
  };

  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  const invoices = await db.invoice.findMany({
    where: where,  
    orderBy: { dueDate: "asc" },
    include: {
      customer: { select: { name: true } },
      payments: { select: { amount: true } },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bucketMap: Record<string, AgingBucket> = {
    current: { label: "Current (0–30 days)", count: 0, total: 0, invoices: [] },
    "31-60": { label: "31–60 days", count: 0, total: 0, invoices: [] },
    "61-90": { label: "61–90 days", count: 0, total: 0, invoices: [] },
    "90+": { label: "90+ days", count: 0, total: 0, invoices: [] },
    noDue: { label: "No Due Date", count: 0, total: 0, invoices: [] },
  };

  let grandTotal = 0;

  for (const inv of invoices) {  
    const amountPaid = (inv.payments ?? []).reduce(
      (sum: number, p: { amount: number }) => sum + p.amount,
      0
    );
    const balance = inv.totalAmount - amountPaid;
    if (balance <= 0) continue;

    let daysOverdue: number | null = null;
    let bucketKey = "noDue";

    if (inv.dueDate) {
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      const diff = Math.floor(
        (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
      );
      daysOverdue = Math.max(0, diff);

      if (diff <= 30) bucketKey = "current";
      else if (diff <= 60) bucketKey = "31-60";
      else if (diff <= 90) bucketKey = "61-90";
      else bucketKey = "90+";
    }

    const row: ReceivablesRow = {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer?.name ?? "—",
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate ?? null,
      totalAmount: inv.totalAmount,
      amountPaid,
      balance,
      daysOverdue,
    };

    bucketMap[bucketKey].count++;
    bucketMap[bucketKey].total += balance;
    bucketMap[bucketKey].invoices.push(row);
    grandTotal += balance;
  }

  const buckets = Object.values(bucketMap).filter(
    (b) => b.count > 0 || b.label === "Current (0–30 days)"
  );

  return { buckets, grandTotal };
}

export async function exportReceivablesCSV(filters: {
  customerId?: string;
}): Promise<string> {
  const result = await getReceivablesAging(filters);

  const allRows: ReceivablesRow[] = [];
  for (const bucket of result.buckets) {
    allRows.push(...bucket.invoices);
  }

  return generateCSV(
    [
      "Invoice #",
      "Customer",
      "Invoice Date",
      "Due Date",
      "Total Amount",
      "Amount Paid",
      "Balance",
      "Days Overdue",
    ],
    allRows.map((r) => [
      r.invoiceNumber,
      r.customerName,
      r.invoiceDate,
      r.dueDate ?? "",
      r.totalAmount.toFixed(2),
      r.amountPaid.toFixed(2),
      r.balance.toFixed(2),
      r.daysOverdue != null ? String(r.daysOverdue) : "",
    ])
  );
}
