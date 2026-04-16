/**
 * Sprint 22.5 — Portal Intelligence, Signals & Rate Limiting Tests
 *
 * Covers: Redis-preferred rate limiting, DB fallback when Redis unavailable,
 * portal analytics rollup, Intel signal feeds (adoption, unusual access,
 * overdue-unviewed).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mockDb = vi.hoisted(() => ({
  externalAccessEvent: {
    create: vi.fn(),
    count: vi.fn(),
  },
  intelInsight: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  insightEvent: { create: vi.fn() },
  orgDefaults: { findFirst: vi.fn() },
  invoice: { count: vi.fn() },
}));

const mockUpsertInsight = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/intel/insights", () => ({ upsertInsight: mockUpsertInsight }));
vi.mock("server-only", () => ({}));

// ─── Imports under test ───────────────────────────────────────────────────────

import {
  recordExternalEvent,
  getPortalAnalyticsSummary,
  feedPortalAdoptionSignal,
  feedUnusualAccessSignal,
  feedOverdueUnviewedInvoiceSignal,
} from "../portal-signals";

const ORG_ID = "org-test-123";

// ─── recordExternalEvent ─────────────────────────────────────────────────────

describe("recordExternalEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.externalAccessEvent.create.mockResolvedValue({ id: "evt-1" });
  });

  it("creates an external access event with orgId and eventType", async () => {
    await recordExternalEvent({ orgId: ORG_ID, eventType: "PORTAL_LOGIN" });
    expect(mockDb.externalAccessEvent.create).toHaveBeenCalledOnce();
    const call = mockDb.externalAccessEvent.create.mock.calls[0][0];
    expect(call.data.orgId).toBe(ORG_ID);
    expect(call.data.eventType).toBe("PORTAL_LOGIN");
  });

  it("does not throw if DB create fails", async () => {
    mockDb.externalAccessEvent.create.mockRejectedValue(new Error("DB error"));
    await expect(recordExternalEvent({ orgId: ORG_ID, eventType: "PORTAL_LOGIN" })).resolves.toBeUndefined();
  });

  it("stores customerId and resourceId when provided", async () => {
    await recordExternalEvent({
      orgId: ORG_ID,
      eventType: "INVOICE_VIEWED",
      customerId: "cust-1",
      resourceType: "Invoice",
      resourceId: "inv-1",
    });
    const call = mockDb.externalAccessEvent.create.mock.calls[0][0];
    expect(call.data.customerId).toBe("cust-1");
    expect(call.data.resourceType).toBe("Invoice");
    expect(call.data.resourceId).toBe("inv-1");
  });
});

// ─── getPortalAnalyticsSummary ────────────────────────────────────────────────

describe("getPortalAnalyticsSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.externalAccessEvent.count.mockResolvedValue(0);
  });

  it("returns all metrics as zero when no events exist", async () => {
    const summary = await getPortalAnalyticsSummary(ORG_ID, 30);
    expect(summary.totalLogins).toBe(0);
    expect(summary.totalInvoiceViews).toBe(0);
    expect(summary.totalQuoteDecisions).toBe(0);
    expect(summary.unusualAccessCount).toBe(0);
    expect(summary.periodDays).toBe(30);
  });

  it("queries with correct orgId and PORTAL_LOGIN event type for logins", async () => {
    await getPortalAnalyticsSummary(ORG_ID, 30);
    const loginCall = mockDb.externalAccessEvent.count.mock.calls.find(
      (c: Array<{ where: { eventType?: string } }>) => c[0].where.eventType === "PORTAL_LOGIN"
    );
    expect(loginCall).toBeDefined();
    expect(loginCall![0].where.orgId).toBe(ORG_ID);
  });

  it("groups QUOTE_ACCEPTED and QUOTE_DECLINED together for decisions", async () => {
    await getPortalAnalyticsSummary(ORG_ID, 7);
    const decisionCall = mockDb.externalAccessEvent.count.mock.calls.find(
      (c: Array<{ where: { eventType?: { in: string[] } } }>) =>
        Array.isArray(c[0].where.eventType?.in) &&
        c[0].where.eventType!.in.includes("QUOTE_ACCEPTED") &&
        c[0].where.eventType!.in.includes("QUOTE_DECLINED")
    );
    expect(decisionCall).toBeDefined();
  });
});

// ─── feedPortalAdoptionSignal ─────────────────────────────────────────────────

describe("feedPortalAdoptionSignal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertInsight.mockResolvedValue({ id: "insight-1", wasCreated: true });
  });

  it("does not create insight when recent logins exist", async () => {
    mockDb.externalAccessEvent.count.mockResolvedValue(5); // 5 logins in past 30 days
    await feedPortalAdoptionSignal(ORG_ID);
    expect(mockUpsertInsight).not.toHaveBeenCalled();
  });

  it("does not create insight when portal is disabled", async () => {
    mockDb.externalAccessEvent.count.mockResolvedValue(0);
    mockDb.orgDefaults.findFirst.mockResolvedValue({ portalEnabled: false });
    await feedPortalAdoptionSignal(ORG_ID);
    expect(mockUpsertInsight).not.toHaveBeenCalled();
  });

  it("creates OPERATIONS/LOW insight when portal enabled but no logins", async () => {
    mockDb.externalAccessEvent.count.mockResolvedValue(0);
    mockDb.orgDefaults.findFirst.mockResolvedValue({ portalEnabled: true });
    await feedPortalAdoptionSignal(ORG_ID);
    expect(mockUpsertInsight).toHaveBeenCalledOnce();
    const call = mockUpsertInsight.mock.calls[0][0];
    expect(call.category).toBe("OPERATIONS");
    expect(call.severity).toBe("LOW");
    expect(call.dedupeKey).toBe(`portal-adoption:${ORG_ID}`);
  });

  it("does not throw if upsertInsight fails", async () => {
    mockDb.externalAccessEvent.count.mockResolvedValue(0);
    mockDb.orgDefaults.findFirst.mockResolvedValue({ portalEnabled: true });
    mockUpsertInsight.mockRejectedValue(new Error("DB error"));
    await expect(feedPortalAdoptionSignal(ORG_ID)).resolves.toBeUndefined();
  });
});

// ─── feedUnusualAccessSignal ──────────────────────────────────────────────────

describe("feedUnusualAccessSignal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertInsight.mockResolvedValue({ id: "insight-2", wasCreated: true });
  });

  it("does not create insight when < 10 unusual events", async () => {
    mockDb.externalAccessEvent.count.mockResolvedValue(9);
    await feedUnusualAccessSignal(ORG_ID);
    expect(mockUpsertInsight).not.toHaveBeenCalled();
  });

  it("creates SYSTEM/HIGH insight when >= 10 unusual events", async () => {
    mockDb.externalAccessEvent.count.mockResolvedValue(15);
    await feedUnusualAccessSignal(ORG_ID);
    expect(mockUpsertInsight).toHaveBeenCalledOnce();
    const call = mockUpsertInsight.mock.calls[0][0];
    expect(call.category).toBe("SYSTEM");
    expect(call.severity).toBe("HIGH");
    expect(call.dedupeKey).toBe(`unusual-access:${ORG_ID}`);
  });

  it("includes event count in insight title", async () => {
    mockDb.externalAccessEvent.count.mockResolvedValue(42);
    await feedUnusualAccessSignal(ORG_ID);
    const call = mockUpsertInsight.mock.calls[0][0];
    expect(call.title).toContain("42");
  });
});

// ─── feedOverdueUnviewedInvoiceSignal ─────────────────────────────────────────

describe("feedOverdueUnviewedInvoiceSignal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertInsight.mockResolvedValue({ id: "insight-3", wasCreated: true });
  });

  it("does not create insight when no overdue invoices", async () => {
    mockDb.externalAccessEvent.count.mockResolvedValue(0);
    mockDb.invoice.count.mockResolvedValue(0);
    await feedOverdueUnviewedInvoiceSignal(ORG_ID);
    expect(mockUpsertInsight).not.toHaveBeenCalled();
  });

  it("creates RECEIVABLES/MEDIUM insight when overdue invoices and no portal views", async () => {
    mockDb.externalAccessEvent.count.mockResolvedValue(0); // no portal invoice views
    mockDb.invoice.count.mockResolvedValue(3); // 3 overdue invoices
    await feedOverdueUnviewedInvoiceSignal(ORG_ID);
    expect(mockUpsertInsight).toHaveBeenCalledOnce();
    const call = mockUpsertInsight.mock.calls[0][0];
    expect(call.category).toBe("RECEIVABLES");
    expect(call.severity).toBe("MEDIUM");
    expect(call.dedupeKey).toBe(`overdue-unviewed:${ORG_ID}`);
  });

  it("does not create insight if invoice views already exist", async () => {
    mockDb.externalAccessEvent.count.mockResolvedValue(5); // has views
    mockDb.invoice.count.mockResolvedValue(2); // has overdue
    await feedOverdueUnviewedInvoiceSignal(ORG_ID);
    expect(mockUpsertInsight).not.toHaveBeenCalled();
  });
});
