import { NextRequest } from "next/server";
import {
  authenticateApiRequest,
  requireScope,
  apiResponse,
  apiError,
  handleApiError,
  ErrorCode,
} from "@/app/api/v1/_helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED_TRIGGERS = [
  "invoice.created",
  "invoice.status_changed",
  "payment.received",
  "customer.created",
  "quote.accepted",
  "ticket.opened",
  "payroll.run.finalized",
] as const;

type TriggerName = (typeof ALLOWED_TRIGGERS)[number];

/**
 * GET /api/v1/zapier/triggers/[triggerName]
 *
 * Zapier polling trigger endpoint. Returns records created/updated since
 * the `since` query parameter (ISO timestamp). Each record has a unique
 * `id` field for Zapier deduplication.
 *
 * Authentication: API key with appropriate read scope.
 * ?since=ISO timestamp (optional — defaults to last 24 hours)
 * ?limit=N (optional — max 100, default 20)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ triggerName: string }> }
) {
  try {
    const auth = await authenticateApiRequest(request);
    const { orgId } = auth;

    const { triggerName } = await params;

    if (!ALLOWED_TRIGGERS.includes(triggerName as TriggerName)) {
      return apiError(
        ErrorCode.NOT_FOUND,
        `Unknown trigger "${triggerName}". Valid triggers: ${ALLOWED_TRIGGERS.join(", ")}`
      );
    }

    const scope = triggerToScope(triggerName as TriggerName);
    requireScope(auth.scopes, scope);

    const url = new URL(request.url);
    const sinceParam = url.searchParams.get("since");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") ?? "20", 10),
      100
    );
    const since = sinceParam
      ? new Date(sinceParam)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const data = await fetchTriggerData(triggerName as TriggerName, orgId, since, limit);

    return apiResponse({ data });
  } catch (err) {
    return handleApiError(err);
  }
}

// ─── Trigger data fetchers ────────────────────────────────────────────────────

async function fetchTriggerData(
  triggerName: TriggerName,
  orgId: string,
  since: Date,
  limit: number
): Promise<unknown[]> {
  switch (triggerName) {
    case "invoice.created":
      return db.invoice.findMany({
        where: { organizationId: orgId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          invoiceDate: true,
          createdAt: true,
          customer: { select: { id: true, name: true } },
        },
      });

    case "invoice.status_changed":
      return db.invoice.findMany({
        where: {
          organizationId: orgId,
          updatedAt: { gte: since },
          status: { not: "DRAFT" },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          updatedAt: true,
          customer: { select: { id: true, name: true } },
        },
      });

    case "payment.received": {
      const payments = await db.invoicePayment.findMany({
        where: { orgId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          amount: true,
          method: true,
          paidAt: true,
          invoice: { select: { invoiceNumber: true } },
        },
      });
      return payments.map((p) => ({
        id: p.id,
        invoiceReference: p.invoice.invoiceNumber,
        amountPaid: p.amount,
        method: p.method ?? "bank",
        receivedAt: p.paidAt,
      }));
    }

    case "customer.created":
      return db.customer.findMany({
        where: { organizationId: orgId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          gstin: true,
          createdAt: true,
        },
      });

    case "quote.accepted":
      return db.quote.findMany({
        where: {
          orgId,
          updatedAt: { gte: since },
          status: "ACCEPTED",
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          totalAmount: true,
          updatedAt: true,
          customer: { select: { id: true, name: true } },
        },
      });

    case "ticket.opened":
      return db.invoiceTicket.findMany({
        where: { orgId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          description: true,
          status: true,
          priority: true,
          createdAt: true,
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      });

    case "payroll.run.finalized":
      return db.payrollRun.findMany({
        where: {
          orgId,
          finalizedAt: { gte: since },
          status: "FINALIZED",
        },
        orderBy: { finalizedAt: "desc" },
        take: limit,
        select: {
          id: true,
          period: true,
          status: true,
          totalNetPay: true,
          finalizedAt: true,
          _count: { select: { runItems: true } },
        },
      });
  }
}

function triggerToScope(trigger: TriggerName): string {
  if (trigger.startsWith("invoice") || trigger.startsWith("payment"))
    return "invoices:read";
  if (trigger.startsWith("customer")) return "customers:read";
  if (trigger.startsWith("quote")) return "quotes:read";
  if (trigger.startsWith("ticket")) return "invoices:read";
  if (trigger.startsWith("payroll")) return "reports:read";
  return "invoices:read";
}
