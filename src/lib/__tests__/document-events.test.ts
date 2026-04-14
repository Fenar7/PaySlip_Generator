/**
 * Phase 19.2 — document-events unit tests
 *
 * Tests the core event creation, per-type emit helpers, and timeline query
 * without hitting the real database (vitest + vi.mock).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock @/lib/db ─────────────────────────────────────────────────────────────
vi.mock("@/lib/db", () => ({
  db: {
    documentEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// ─── Mock @/lib/auth ───────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn().mockResolvedValue({
    orgId: "org-test",
    userId: "user-test",
  }),
}));

import { db } from "@/lib/db";
import {
  createDocEvent,
  emitInvoiceEvent,
  emitVoucherEvent,
  emitSalarySlipEvent,
  emitQuoteEvent,
  getDocumentTimeline,
  getDocumentTimelineForPage,
} from "@/lib/document-events";

// Typed access to mocked db.documentEvent
const mockDocEvent = db.documentEvent as unknown as {
  create: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockDocEvent.create.mockResolvedValue(undefined);
  mockDocEvent.findMany.mockResolvedValue([]);
});

// ─── createDocEvent ────────────────────────────────────────────────────────────

describe("createDocEvent", () => {
  it("calls db.documentEvent.create with correct fields", async () => {
    await createDocEvent({
      orgId: "org-1",
      docType: "invoice",
      documentId: "inv-1",
      eventType: "created",
      actorId: "user-1",
      actorLabel: "Alice",
      metadata: { invoiceNumber: "INV-001" },
    });

    expect(mockDocEvent.create).toHaveBeenCalledWith({
      data: {
        orgId: "org-1",
        docType: "invoice",
        documentId: "inv-1",
        eventType: "created",
        actorId: "user-1",
        actorLabel: "Alice",
        metadata: { invoiceNumber: "INV-001" },
      },
    });
  });

  it("sets actorId and actorLabel to null when not provided", async () => {
    await createDocEvent({
      orgId: "org-1",
      docType: "voucher",
      documentId: "v-1",
      eventType: "archived",
    });

    const call = mockDocEvent.create.mock.calls[0][0];
    expect(call.data.actorId).toBeNull();
    expect(call.data.actorLabel).toBeNull();
    expect(call.data.metadata).toBeUndefined();
  });
});

// ─── Per-type emit helpers ─────────────────────────────────────────────────────

describe("emitInvoiceEvent", () => {
  it("emits with docType = invoice", async () => {
    await emitInvoiceEvent("org-1", "inv-1", "issued", { actorId: "u1" });
    const call = mockDocEvent.create.mock.calls[0][0];
    expect(call.data.docType).toBe("invoice");
    expect(call.data.eventType).toBe("issued");
    expect(call.data.actorId).toBe("u1");
  });

  it("supports all invoice lifecycle events", async () => {
    const events = ["created", "updated", "archived", "duplicated", "cancelled", "reissued"] as const;
    for (const evt of events) {
      mockDocEvent.create.mockClear();
      await emitInvoiceEvent("org-1", "inv-1", evt);
      expect(mockDocEvent.create).toHaveBeenCalledOnce();
    }
  });
});

describe("emitVoucherEvent", () => {
  it("emits with docType = voucher", async () => {
    await emitVoucherEvent("org-1", "v-1", "approved");
    const call = mockDocEvent.create.mock.calls[0][0];
    expect(call.data.docType).toBe("voucher");
    expect(call.data.eventType).toBe("approved");
  });
});

describe("emitSalarySlipEvent", () => {
  it("emits with docType = salary_slip", async () => {
    await emitSalarySlipEvent("org-1", "slip-1", "released", {
      metadata: { slipNumber: "SS-001" },
    });
    const call = mockDocEvent.create.mock.calls[0][0];
    expect(call.data.docType).toBe("salary_slip");
    expect(call.data.eventType).toBe("released");
    expect(call.data.metadata).toEqual({ slipNumber: "SS-001" });
  });

  it("emits paid event", async () => {
    await emitSalarySlipEvent("org-1", "slip-1", "paid");
    const call = mockDocEvent.create.mock.calls[0][0];
    expect(call.data.eventType).toBe("paid");
  });
});

describe("emitQuoteEvent", () => {
  it("emits with docType = quote", async () => {
    await emitQuoteEvent("org-1", "q-1", "created");
    const call = mockDocEvent.create.mock.calls[0][0];
    expect(call.data.docType).toBe("quote");
    expect(call.data.eventType).toBe("created");
  });

  it("supports quote_converted (first-class lifecycle)", async () => {
    await emitQuoteEvent("org-1", "q-1", "quote_converted", {
      actorId: "u1",
      metadata: { invoiceId: "inv-99" },
    });
    const call = mockDocEvent.create.mock.calls[0][0];
    expect(call.data.eventType).toBe("quote_converted");
    expect(call.data.metadata).toEqual({ invoiceId: "inv-99" });
  });

  it("supports quote_accepted and quote_declined", async () => {
    await emitQuoteEvent("org-1", "q-1", "quote_accepted");
    expect(mockDocEvent.create.mock.calls[0][0].data.eventType).toBe("quote_accepted");

    mockDocEvent.create.mockClear();
    await emitQuoteEvent("org-1", "q-1", "quote_declined");
    expect(mockDocEvent.create.mock.calls[0][0].data.eventType).toBe("quote_declined");
  });
});

// ─── getDocumentTimeline ───────────────────────────────────────────────────────

describe("getDocumentTimeline", () => {
  it("queries with correct org + docType + documentId scoping", async () => {
    await getDocumentTimeline("org-1", "quote", "q-abc", 50);

    expect(mockDocEvent.findMany).toHaveBeenCalledWith({
      where: { orgId: "org-1", docType: "quote", documentId: "q-abc" },
      orderBy: { eventAt: "asc" },
      take: 50,
    });
  });

  it("returns empty array when no events exist", async () => {
    mockDocEvent.findMany.mockResolvedValue([]);
    const result = await getDocumentTimeline("org-1", "invoice", "inv-1");
    expect(result).toEqual([]);
  });

  it("returns events in the shape returned by db", async () => {
    const fakeEvents = [
      {
        id: "e-1",
        orgId: "org-1",
        docType: "salary_slip",
        documentId: "slip-1",
        eventType: "released",
        actorId: "u1",
        actorLabel: "Bob",
        eventAt: new Date("2026-04-01"),
        metadata: null,
      },
    ];
    mockDocEvent.findMany.mockResolvedValue(fakeEvents);
    const result = await getDocumentTimeline("org-1", "salary_slip", "slip-1");
    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe("released");
    expect(result[0].actorLabel).toBe("Bob");
  });

  it("enforces default limit of 100", async () => {
    await getDocumentTimeline("org-1", "voucher", "v-1");
    const call = mockDocEvent.findMany.mock.calls[0][0];
    expect(call.take).toBe(100);
  });
});

// ─── getDocumentTimelineForPage ────────────────────────────────────────────────

describe("getDocumentTimelineForPage", () => {
  it("derives orgId from session and delegates to getDocumentTimeline", async () => {
    // requireOrgContext is mocked to return org-test
    mockDocEvent.findMany.mockResolvedValue([]);
    await getDocumentTimelineForPage("invoice", "inv-xyz");

    expect(mockDocEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: "org-test",
          docType: "invoice",
          documentId: "inv-xyz",
        }),
      })
    );
  });
});

// ─── Cross-org safety ─────────────────────────────────────────────────────────

describe("org-scoping", () => {
  it("never passes orgId from document; always uses the param orgId", async () => {
    await getDocumentTimeline("org-safe", "quote", "q-1");
    const call = mockDocEvent.findMany.mock.calls[0][0];
    // Must exactly match the orgId we passed — no fallback to document's org
    expect(call.where.orgId).toBe("org-safe");
  });

  it("writes to exact orgId on create", async () => {
    await createDocEvent({ orgId: "org-exact", docType: "voucher", documentId: "v-1", eventType: "created" });
    expect(mockDocEvent.create.mock.calls[0][0].data.orgId).toBe("org-exact");
  });
});
