/**
 * Phase 19 Sprint 19.2 — document-events.ts
 *
 * Normalized lifecycle event helpers for the SW Docs timeline layer.
 * All four document types (invoice, voucher, salary_slip, quote) emit
 * DocumentEvent records via these helpers.
 *
 * Design rules:
 *  - Append-only — no updates or deletes
 *  - Org-scoped — all writes carry orgId, all reads filter by it
 *  - Fire-and-forget safe — callers may `void` the promise where latency matters
 *  - Source-of-truth models remain Invoice / Voucher / SalarySlip / Quote
 */

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocType = "invoice" | "voucher" | "salary_slip" | "quote";

export type EventType =
  | "created"
  | "updated"
  | "duplicated"
  | "archived"
  | "restored"
  | "issued"
  | "approved"
  | "released"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "disputed"
  | "cancelled"
  | "reissued"
  | "sent"
  | "viewed"
  | "quote_accepted"
  | "quote_declined"
  | "quote_converted";

export interface CreateDocEventParams {
  orgId: string;
  docType: DocType;
  documentId: string;
  eventType: EventType;
  actorId?: string | null;
  actorLabel?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DocEventRow {
  id: string;
  orgId: string;
  docType: string;
  documentId: string;
  eventType: string;
  actorId: string | null;
  actorLabel: string | null;
  eventAt: Date;
  metadata: unknown;
}

export interface DocTimeline {
  events: DocEventRow[];
}

// ─── Write helpers ────────────────────────────────────────────────────────────

/**
 * Appends a single normalized DocumentEvent.
 * Idempotency note: events are intentionally not idempotent — each
 * lifecycle action should call this once. Callers are responsible for
 * not double-firing.
 */
export async function createDocEvent(params: CreateDocEventParams): Promise<void> {
  await db.documentEvent.create({
    data: {
      orgId: params.orgId,
      docType: params.docType,
      documentId: params.documentId,
      eventType: params.eventType,
      actorId: params.actorId ?? null,
      actorLabel: params.actorLabel ?? null,
      metadata: params.metadata != null ? (params.metadata as object) : undefined,
    },
  });
}

// ─── Per-type convenience helpers ─────────────────────────────────────────────

export async function emitInvoiceEvent(
  orgId: string,
  invoiceId: string,
  eventType: EventType,
  opts?: { actorId?: string | null; actorLabel?: string | null; metadata?: Record<string, unknown> }
): Promise<void> {
  return createDocEvent({
    orgId,
    docType: "invoice",
    documentId: invoiceId,
    eventType,
    ...opts,
  });
}

export async function emitVoucherEvent(
  orgId: string,
  voucherId: string,
  eventType: EventType,
  opts?: { actorId?: string | null; actorLabel?: string | null; metadata?: Record<string, unknown> }
): Promise<void> {
  return createDocEvent({
    orgId,
    docType: "voucher",
    documentId: voucherId,
    eventType,
    ...opts,
  });
}

export async function emitSalarySlipEvent(
  orgId: string,
  slipId: string,
  eventType: EventType,
  opts?: { actorId?: string | null; actorLabel?: string | null; metadata?: Record<string, unknown> }
): Promise<void> {
  return createDocEvent({
    orgId,
    docType: "salary_slip",
    documentId: slipId,
    eventType,
    ...opts,
  });
}

export async function emitQuoteEvent(
  orgId: string,
  quoteId: string,
  eventType: EventType,
  opts?: { actorId?: string | null; actorLabel?: string | null; metadata?: Record<string, unknown> }
): Promise<void> {
  return createDocEvent({
    orgId,
    docType: "quote",
    documentId: quoteId,
    eventType,
    ...opts,
  });
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

/**
 * Fetch the timeline for a single document.
 * Org-scoped: checks orgId on every query.
 * Ordered chronologically, oldest → newest.
 */
export async function getDocumentTimeline(
  orgId: string,
  docType: DocType,
  documentId: string,
  limit = 100
): Promise<DocEventRow[]> {
  const events = await db.documentEvent.findMany({
    where: { orgId, docType, documentId },
    orderBy: { eventAt: "asc" },
    take: limit,
  });
  return events as DocEventRow[];
}

/**
 * Server-action-friendly wrapper — derives orgId from session.
 * Use this in page.tsx server components.
 */
export async function getDocumentTimelineForPage(
  docType: DocType,
  documentId: string
): Promise<DocEventRow[]> {
  const { orgId } = await requireOrgContext();
  return getDocumentTimeline(orgId, docType, documentId);
}
