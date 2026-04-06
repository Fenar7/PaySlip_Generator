import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  authenticateApiRequest,
  requireScope,
  apiResponse,
  handleApiError,
  logApiRequest,
  getClientIp,
} from "../../_helpers";

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "read:reports");

    const now = new Date();

    const unpaidInvoices = await db.invoice.findMany({
      where: {
        organizationId: auth.orgId,
        status: { in: ["ISSUED", "DUE", "OVERDUE", "PARTIALLY_PAID"] },
        archivedAt: null,
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        status: true,
        totalAmount: true,
        customerId: true,
        customer: { select: { name: true } },
      },
      orderBy: { invoiceDate: "asc" },
    });

    // Aging buckets
    const buckets = {
      current: [] as typeof unpaidInvoices,
      days_1_30: [] as typeof unpaidInvoices,
      days_31_60: [] as typeof unpaidInvoices,
      days_61_90: [] as typeof unpaidInvoices,
      days_90_plus: [] as typeof unpaidInvoices,
    };

    for (const inv of unpaidInvoices) {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) buckets.current.push(inv);
      else if (daysOverdue <= 30) buckets.days_1_30.push(inv);
      else if (daysOverdue <= 60) buckets.days_31_60.push(inv);
      else if (daysOverdue <= 90) buckets.days_61_90.push(inv);
      else buckets.days_90_plus.push(inv);
    }

    const sumBucket = (items: typeof unpaidInvoices) =>
      items.reduce((sum, inv) => sum + inv.totalAmount, 0);

    const resp = apiResponse({
      totalOutstanding: sumBucket(unpaidInvoices),
      totalCount: unpaidInvoices.length,
      currency: "INR",
      aging: {
        current: { count: buckets.current.length, amount: sumBucket(buckets.current) },
        "1-30_days": { count: buckets.days_1_30.length, amount: sumBucket(buckets.days_1_30) },
        "31-60_days": { count: buckets.days_31_60.length, amount: sumBucket(buckets.days_31_60) },
        "61-90_days": { count: buckets.days_61_90.length, amount: sumBucket(buckets.days_61_90) },
        "90+_days": { count: buckets.days_90_plus.length, amount: sumBucket(buckets.days_90_plus) },
      },
      invoices: unpaidInvoices,
    });
    logApiRequest(auth.orgId, auth.apiKeyId, "GET", "/api/v1/reports/outstanding", 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
