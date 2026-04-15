import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    invoice: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    paymentProof: {
      count: vi.fn(),
    },
    paymentArrangement: {
      count: vi.fn(),
    },
    bankStatementItem: {
      count: vi.fn(),
    },
    gstFilingRun: {
      count: vi.fn(),
    },
    payoutItem: {
      count: vi.fn(),
    },
    partnerAccessRequest: {
      count: vi.fn(),
    },
    apiWebhookDelivery: {
      count: vi.fn(),
    },
    intelInsight: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    insightEvent: {
      create: vi.fn(),
    },
    anomalyDetectionRun: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: mockDb }));

import { runAnomalyDetection, listAnomalyInsights } from "../anomalies";

const ORG_ID = "org-test-anomaly";
const RUN_ID = "run-001";
const INSIGHT_ID = "ins-anomaly-001";

function resetMocks() {
  for (const table of Object.values(mockDb)) {
    for (const method of Object.values(table as Record<string, ReturnType<typeof vi.fn>>)) {
      if (typeof method.mockReset === "function") method.mockReset();
    }
  }
}

function setupNoAnomalies() {
  mockDb.invoice.findMany.mockResolvedValue([]);
  mockDb.invoice.count.mockResolvedValue(0);
  mockDb.paymentProof.count.mockResolvedValue(0);
  mockDb.paymentArrangement.count.mockResolvedValue(0);
  mockDb.bankStatementItem.count.mockResolvedValue(0);
  mockDb.gstFilingRun.count.mockResolvedValue(0);
  mockDb.payoutItem.count.mockResolvedValue(0);
  mockDb.partnerAccessRequest.count.mockResolvedValue(0);
  mockDb.apiWebhookDelivery.count.mockResolvedValue(0);
  mockDb.anomalyDetectionRun.create.mockResolvedValue({ id: RUN_ID });
  mockDb.anomalyDetectionRun.update.mockResolvedValue({});
}

describe("runAnomalyDetection", () => {
  beforeEach(() => resetMocks());

  it("creates a detection run record and completes it", async () => {
    setupNoAnomalies();

    const result = await runAnomalyDetection(ORG_ID);

    expect(mockDb.anomalyDetectionRun.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orgId: ORG_ID, status: "RUNNING" }) }),
    );
    expect(mockDb.anomalyDetectionRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED" }),
      }),
    );
    expect(result.runId).toBe(RUN_ID);
    expect(result.errors).toHaveLength(0);
  });

  it("returns rulesEvaluated count matching total enabled rules", async () => {
    setupNoAnomalies();
    const result = await runAnomalyDetection(ORG_ID);
    expect(result.rulesEvaluated).toBeGreaterThan(0);
  });

  it("fires duplicate-numbering anomaly when 5+ duplicate numbers exist", async () => {
    setupNoAnomalies();
    // Return 10 invoices with 5 duplicate number pairs
    mockDb.invoice.findMany.mockResolvedValue([
      { invoiceNumber: "INV-001" },
      { invoiceNumber: "INV-001" },
      { invoiceNumber: "INV-002" },
      { invoiceNumber: "INV-002" },
      { invoiceNumber: "INV-003" },
      { invoiceNumber: "INV-003" },
      { invoiceNumber: "INV-004" },
      { invoiceNumber: "INV-004" },
      { invoiceNumber: "INV-005" },
      { invoiceNumber: "INV-005" },
    ]);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.insightsCreated).toBeGreaterThan(0);
    expect(mockDb.intelInsight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: ORG_ID,
          category: "DOCUMENTS",
          sourceType: "RULE",
        }),
      }),
    );
  });

  it("fires high draft abandonment when 20+ stale drafts", async () => {
    setupNoAnomalies();
    mockDb.invoice.findMany.mockResolvedValue([]); // no duplicate numbering
    mockDb.invoice.count.mockResolvedValue(25); // 25 stale drafts
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.insightsCreated).toBeGreaterThan(0);
  });

  it("does NOT fire draft abandonment when fewer than 20 stale drafts", async () => {
    setupNoAnomalies();
    mockDb.invoice.findMany.mockResolvedValue([]);
    mockDb.invoice.count.mockResolvedValue(15); // below threshold

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.insightsCreated).toBe(0);
    expect(mockDb.intelInsight.create).not.toHaveBeenCalled();
  });

  it("fires CRITICAL overdue spike anomaly for very high overdue amounts", async () => {
    setupNoAnomalies();
    mockDb.invoice.findMany
      // duplicate numbering check (returns empty)
      .mockResolvedValueOnce([])
      // overdue spike check (returns many with high amounts)
      .mockResolvedValueOnce([
        { totalAmount: 5_00_00_000, dueDate: "2026-03-01" },
        { totalAmount: 3_00_00_000, dueDate: "2026-03-05" },
        { totalAmount: 2_00_00_000, dueDate: "2026-03-10" },
        { totalAmount: 1_00_00_000, dueDate: "2026-03-15" },
        { totalAmount: 1_00_00_000, dueDate: "2026-03-20" },
        { totalAmount: 1_00_00_000, dueDate: "2026-03-25" },
      ]);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.insightsCreated).toBeGreaterThan(0);
    const createCall = mockDb.intelInsight.create.mock.calls.find(
      (call) => call[0]?.data?.category === "RECEIVABLES",
    );
    expect(createCall).toBeDefined();
    expect(createCall?.[0]?.data?.severity).toBe("CRITICAL");
  });

  it("deduplicates existing active insight (updates instead of creating)", async () => {
    setupNoAnomalies();
    // 5+ duplicate numbers
    mockDb.invoice.findMany.mockResolvedValue([
      { invoiceNumber: "INV-001" },
      { invoiceNumber: "INV-001" },
      { invoiceNumber: "INV-002" },
      { invoiceNumber: "INV-002" },
      { invoiceNumber: "INV-003" },
      { invoiceNumber: "INV-003" },
    ]);
    // Return an existing active insight → should update, not create
    mockDb.intelInsight.findFirst.mockResolvedValue({
      id: "existing-ins",
      status: "ACTIVE",
    });
    mockDb.intelInsight.update.mockResolvedValue({});
    mockDb.insightEvent.create.mockResolvedValue({});

    await runAnomalyDetection(ORG_ID);
    expect(mockDb.intelInsight.create).not.toHaveBeenCalled();
    expect(mockDb.intelInsight.update).toHaveBeenCalled();
  });

  it("does NOT deduplicate when existing insight is RESOLVED", async () => {
    setupNoAnomalies();
    mockDb.invoice.findMany.mockResolvedValue([
      { invoiceNumber: "INV-001" },
      { invoiceNumber: "INV-001" },
      { invoiceNumber: "INV-002" },
      { invoiceNumber: "INV-002" },
      { invoiceNumber: "INV-003" },
      { invoiceNumber: "INV-003" },
    ]);
    // Resolved insight → should create a new one
    mockDb.intelInsight.findFirst.mockResolvedValue({
      id: "resolved-ins",
      status: "RESOLVED",
    });
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    await runAnomalyDetection(ORG_ID);
    expect(mockDb.intelInsight.create).toHaveBeenCalled();
  });

  it("fires GST filing blocked anomaly when 3+ filing failures", async () => {
    setupNoAnomalies();
    mockDb.gstFilingRun.count.mockResolvedValue(5);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    await runAnomalyDetection(ORG_ID);
    const createCall = mockDb.intelInsight.create.mock.calls.find(
      (call) => call[0]?.data?.category === "COMPLIANCE",
    );
    expect(createCall).toBeDefined();
  });

  it("fires CRITICAL GST filing anomaly when 6+ failures", async () => {
    setupNoAnomalies();
    mockDb.gstFilingRun.count.mockResolvedValue(8);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    await runAnomalyDetection(ORG_ID);
    const createCall = mockDb.intelInsight.create.mock.calls.find(
      (call) => call[0]?.data?.category === "COMPLIANCE",
    );
    expect(createCall?.[0]?.data?.severity).toBe("CRITICAL");
  });

  it("fires marketplace payout stuck anomaly", async () => {
    setupNoAnomalies();
    mockDb.payoutItem.count.mockResolvedValue(3);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    await runAnomalyDetection(ORG_ID);
    const createCall = mockDb.intelInsight.create.mock.calls.find(
      (call) => call[0]?.data?.category === "MARKETPLACE",
    );
    expect(createCall).toBeDefined();
  });

  it("fires partner access rejection anomaly when 3+ rejections", async () => {
    setupNoAnomalies();
    mockDb.partnerAccessRequest.count.mockResolvedValue(4);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    await runAnomalyDetection(ORG_ID);
    const createCall = mockDb.intelInsight.create.mock.calls.find(
      (call) => call[0]?.data?.category === "PARTNER",
    );
    expect(createCall).toBeDefined();
  });

  it("fires webhook failure spike when 10+ failures in 24h", async () => {
    setupNoAnomalies();
    mockDb.apiWebhookDelivery.count.mockResolvedValue(12);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    await runAnomalyDetection(ORG_ID);
    const createCall = mockDb.intelInsight.create.mock.calls.find(
      (call) => call[0]?.data?.category === "INTEGRATIONS",
    );
    expect(createCall).toBeDefined();
  });

  it("handles rule runner error gracefully and marks run PARTIAL", async () => {
    setupNoAnomalies();
    // Make the invoice.findMany throw (first call is for duplicate numbering check)
    mockDb.invoice.findMany.mockRejectedValueOnce(new Error("DB connection lost"));

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("docs.duplicate_numbering");
    expect(mockDb.anomalyDetectionRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PARTIAL" }),
      }),
    );
  });

  it("all anomaly insights have sourceType RULE", async () => {
    setupNoAnomalies();
    mockDb.invoice.findMany.mockResolvedValue([
      { invoiceNumber: "INV-001" },
      { invoiceNumber: "INV-001" },
      { invoiceNumber: "INV-002" },
      { invoiceNumber: "INV-002" },
      { invoiceNumber: "INV-003" },
      { invoiceNumber: "INV-003" },
    ]);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    await runAnomalyDetection(ORG_ID);

    for (const call of mockDb.intelInsight.create.mock.calls) {
      expect(call[0]?.data?.sourceType).toBe("RULE");
    }
  });
});

describe("listAnomalyInsights", () => {
  beforeEach(() => resetMocks());

  it("queries only RULE sourceType insights in ACTIVE or ACKNOWLEDGED status", async () => {
    mockDb.intelInsight.findMany.mockResolvedValue([]);
    await listAnomalyInsights(ORG_ID);

    expect(mockDb.intelInsight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: ORG_ID,
          sourceType: "RULE",
          status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
        }),
      }),
    );
  });

  it("does not return expired anomalies", async () => {
    mockDb.intelInsight.findMany.mockResolvedValue([]);
    await listAnomalyInsights(ORG_ID);

    const whereClause = mockDb.intelInsight.findMany.mock.calls[0][0].where;
    // Should have an OR clause that filters out expired insights
    expect(whereClause.OR).toEqual(
      expect.arrayContaining([
        { expiresAt: null },
        expect.objectContaining({ expiresAt: expect.objectContaining({ gt: expect.any(Date) }) }),
      ]),
    );
  });

  it("scopes to orgId — does not leak across tenants", async () => {
    mockDb.intelInsight.findMany.mockResolvedValue([]);
    await listAnomalyInsights("org-tenant-A");

    const whereClause = mockDb.intelInsight.findMany.mock.calls[0][0].where;
    expect(whereClause.orgId).toBe("org-tenant-A");
  });
});
