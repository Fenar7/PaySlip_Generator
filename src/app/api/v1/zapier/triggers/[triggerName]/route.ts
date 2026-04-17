import { NextRequest } from "next/server";
import {
  authenticateApiRequest,
  requireScope,
  apiResponse,
  apiError,
  handleApiError,
} from "@/app/api/v1/_helpers";
import db from "@/lib/db";

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
    if (!auth.ok) return apiError(401, auth.error);

    const { triggerName } = await params;

    if (!ALLOWED_TRIGGERS.includes(triggerName as TriggerName)) {
      return apiError(
        404,
        `Unknown trigger "${triggerName}". Valid triggers: ${ALLOWED_TRIGGERS.join(", ")}`
      );
    }

    const scope = triggerToScope(triggerName as TriggerName);
    const scopeCheck = requireScope(auth.scopes, scope);
    if (!scopeCheck.ok) return apiError(403, scopeCheck.error);

    const { orgId } = auth;
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
          status: { not: "draft" },
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
      // Journal entries that represent payment receipt (debit bank account)
      const entries = await db.journalEntry.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: since },
          reference: { contains: "INV" },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          reference: true,
          amount: true,
          narration: true,
          createdAt: true,
        },
      });
      return entries.map((e) => ({
        id: e.id,
        invoiceReference: e.reference,
        amountPaid: Number(e.amount),
        method: "bank",
        receivedAt: e.createdAt,
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
          organizationId: orgId,
          updatedAt: { gte: since },
          status: "accepted",
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
      return db.ticket.findMany({
        where: { organizationId: orgId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
          customer: { select: { id: true, name: true } },
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
