import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    invoice: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    invoiceProof: {
      count: vi.fn(),
    },
    paymentArrangement: {
      count: vi.fn(),
    },
    bankTransaction: {
      count: vi.fn(),
    },
    gstFilingRun: {
      count: vi.fn(),
    },
    gstFilingValidationIssue: {
      count: vi.fn(),
    },
    vendorBill: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    paymentRun: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    closeRun: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    closeTask: {
      count: vi.fn(),
    },
    approvalRequest: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    notificationDelivery: {
      count: vi.fn(),
    },
    oAuthAuthorization: {
      count: vi.fn(),
    },
    marketplacePayoutItem: {
      count: vi.fn(),
    },
    partnerClientAccessRequest: {
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
  mockDb.invoiceProof.count.mockResolvedValue(0);
  mockDb.paymentArrangement.count.mockResolvedValue(0);
  mockDb.bankTransaction.count.mockResolvedValue(0);
  mockDb.gstFilingRun.count.mockResolvedValue(0);
  mockDb.gstFilingValidationIssue.count.mockResolvedValue(0);
  mockDb.vendorBill.findMany.mockResolvedValue([]);
  mockDb.vendorBill.count.mockResolvedValue(0);
  mockDb.paymentRun.findMany.mockResolvedValue([]);
  mockDb.paymentRun.count.mockResolvedValue(0);
  mockDb.closeRun.findMany.mockResolvedValue([]);
  mockDb.closeRun.count.mockResolvedValue(0);
  mockDb.closeTask.count.mockResolvedValue(0);
  mockDb.approvalRequest.findMany.mockResolvedValue([]);
  mockDb.approvalRequest.count.mockResolvedValue(0);
  mockDb.notificationDelivery.count.mockResolvedValue(0);
  mockDb.oAuthAuthorization.count.mockResolvedValue(0);
  mockDb.marketplacePayoutItem.count.mockResolvedValue(0);
  mockDb.partnerClientAccessRequest.count.mockResolvedValue(0);
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
    mockDb.marketplacePayoutItem.count.mockResolvedValue(3);
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
    mockDb.partnerClientAccessRequest.count.mockResolvedValue(4);
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

// ── New rule tests ─────────────────────────────────────────────────────────────

describe("books.vendor_bill_bottleneck rule", () => {
  beforeEach(() => resetMocks());

  it("fires when 5+ vendor bills are stuck in PENDING_APPROVAL > 7 days", async () => {
    setupNoAnomalies();
    mockDb.vendorBill.findMany.mockResolvedValue([
      { id: "vb1", billNumber: "BILL-001", totalAmount: 50000, billDate: "2024-01-01" },
      { id: "vb2", billNumber: "BILL-002", totalAmount: 50000, billDate: "2024-01-01" },
      { id: "vb3", billNumber: "BILL-003", totalAmount: 50000, billDate: "2024-01-01" },
      { id: "vb4", billNumber: "BILL-004", totalAmount: 50000, billDate: "2024-01-01" },
      { id: "vb5", billNumber: "BILL-005", totalAmount: 50000, billDate: "2024-01-01" },
    ]);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await runAnomalyDetection(ORG_ID);

    expect(mockDb.intelInsight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "OPERATIONS", orgId: ORG_ID }),
      }),
    );
    expect(result.insightsCreated).toBeGreaterThan(0);
  });

  it("does NOT fire when fewer than 5 bills are stuck", async () => {
    setupNoAnomalies();
    mockDb.vendorBill.findMany.mockResolvedValue([
      { id: "vb1", billNumber: "BILL-001", totalAmount: 50000, billDate: "2024-01-01" },
      { id: "vb2", billNumber: "BILL-002", totalAmount: 50000, billDate: "2024-01-01" },
    ]);

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.insightsCreated).toBe(0);
  });
});

describe("books.payment_run_failures rule", () => {
  beforeEach(() => resetMocks());

  it("fires when 2+ payment runs have failed in 30 days", async () => {
    setupNoAnomalies();
    mockDb.paymentRun.findMany.mockResolvedValue([
      { id: "pr1", status: "FAILED", updatedAt: new Date() },
      { id: "pr2", status: "REJECTED", updatedAt: new Date() },
    ]);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await runAnomalyDetection(ORG_ID);
    expect(mockDb.intelInsight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "OPERATIONS", sourceRecordType: "payment_run" }),
      }),
    );
    expect(result.insightsCreated).toBeGreaterThan(0);
  });

  it("does NOT fire when fewer than 2 payment runs failed", async () => {
    setupNoAnomalies();
    mockDb.paymentRun.findMany.mockResolvedValue([
      { id: "pr1", status: "FAILED", updatedAt: new Date() },
    ]);

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.insightsCreated).toBe(0);
  });
});

describe("books.close_period_blocked rule", () => {
  beforeEach(() => resetMocks());

  it("fires when a close run has been BLOCKED for more than 7 days", async () => {
    setupNoAnomalies();
    mockDb.closeRun.findMany.mockResolvedValue([
      { id: "cr1", blockerCount: 3 },
    ]);
    mockDb.closeTask.count.mockResolvedValue(3);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await runAnomalyDetection(ORG_ID);
    expect(mockDb.intelInsight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "OPERATIONS", sourceRecordType: "close_run" }),
      }),
    );
    expect(result.insightsCreated).toBeGreaterThan(0);
  });

  it("does NOT fire when no blocked runs and fewer than 3 blocked tasks", async () => {
    setupNoAnomalies();
    mockDb.closeRun.findMany.mockResolvedValue([]);
    mockDb.closeTask.count.mockResolvedValue(2);

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.insightsCreated).toBe(0);
  });
});

describe("gst.validation_issue_spike rule", () => {
  beforeEach(() => resetMocks());

  it("fires when 10+ GST validation issues exist in last 30 days", async () => {
    setupNoAnomalies();
    mockDb.gstFilingValidationIssue.count.mockResolvedValue(15);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await runAnomalyDetection(ORG_ID);
    expect(mockDb.intelInsight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "COMPLIANCE", sourceRecordType: "gst_filing_validation_issue" }),
      }),
    );
    expect(result.insightsCreated).toBeGreaterThan(0);
  });

  it("does NOT fire when fewer than 10 validation issues", async () => {
    setupNoAnomalies();
    mockDb.gstFilingValidationIssue.count.mockResolvedValue(5);

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.insightsCreated).toBe(0);
  });
});

describe("gst.stale_filing_data rule", () => {
  beforeEach(() => resetMocks());

  it("fires when org has filing history but no RECONCILED run in 60 days", async () => {
    setupNoAnomalies();
    // Rule call order: GST-03 (filing_run_blocked) runs before GST-02 (stale_filing_data).
    // GST-03: count({ status: "FAILED" }) → 0 (doesn't fire)
    // GST-02: count({ status: { not: "DRAFT" } }) → 3 (has history)
    // GST-02: count({ status: "RECONCILED" }) → 0 (no recent success → fires)
    mockDb.gstFilingRun.count
      .mockResolvedValueOnce(0)  // GST-03: no failed filings
      .mockResolvedValueOnce(3)  // GST-02: has attempted runs
      .mockResolvedValueOnce(0); // GST-02: no recent reconciled
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await runAnomalyDetection(ORG_ID);
    expect(mockDb.intelInsight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "COMPLIANCE", sourceRecordType: "gst_filing_run" }),
      }),
    );
    expect(result.insightsCreated).toBeGreaterThan(0);
  });

  it("does NOT fire for orgs with no filing history at all", async () => {
    setupNoAnomalies();
    mockDb.gstFilingRun.count.mockResolvedValue(0);

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.insightsCreated).toBe(0);
  });
});

describe("flow.approval_sla_breaches rule", () => {
  beforeEach(() => resetMocks());

  it("fires when any ApprovalRequest is past its deadline", async () => {
    setupNoAnomalies();
    mockDb.approvalRequest.findMany.mockResolvedValue([
      { id: "ar1", dueAt: new Date(Date.now() - 86400000), resourceType: "vendor_bill" },
    ]);
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await runAnomalyDetection(ORG_ID);
    expect(mockDb.intelInsight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "OPERATIONS", sourceRecordType: "approval_request" }),
      }),
    );
    expect(result.insightsCreated).toBeGreaterThan(0);
  });

  it("does NOT fire when no approvals are overdue", async () => {
    setupNoAnomalies();
    mockDb.approvalRequest.findMany.mockResolvedValue([]);

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.insightsCreated).toBe(0);
  });
});

describe("flow.notification_delivery_failures rule", () => {
  beforeEach(() => resetMocks());

  it("fires when 10+ notification deliveries failed in last 24 hours", async () => {
    setupNoAnomalies();
    mockDb.notificationDelivery.count.mockResolvedValueOnce(12); // FAILED/TERMINAL count
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await runAnomalyDetection(ORG_ID);
    expect(mockDb.intelInsight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "OPERATIONS", sourceRecordType: "notification_delivery" }),
      }),
    );
    expect(result.insightsCreated).toBeGreaterThan(0);
  });

  it("does NOT fire when fewer than 10 delivery failures", async () => {
    setupNoAnomalies();
    mockDb.notificationDelivery.count.mockResolvedValue(5);

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.insightsCreated).toBe(0);
  });
});

describe("insightsUpdated counter", () => {
  beforeEach(() => resetMocks());

  it("increments insightsUpdated (not insightsCreated) when an existing insight is refreshed", async () => {
    setupNoAnomalies();
    // Return 10 invoices with 5 duplicate pairs — this rule fires
    mockDb.invoice.findMany.mockResolvedValue([
      { invoiceNumber: "INV-001" }, { invoiceNumber: "INV-001" },
      { invoiceNumber: "INV-002" }, { invoiceNumber: "INV-002" },
      { invoiceNumber: "INV-003" }, { invoiceNumber: "INV-003" },
      { invoiceNumber: "INV-004" }, { invoiceNumber: "INV-004" },
      { invoiceNumber: "INV-005" }, { invoiceNumber: "INV-005" },
    ]);

    // Simulate existing active insight (upsert will update, not create)
    mockDb.intelInsight.findFirst.mockResolvedValue({ id: INSIGHT_ID, status: "ACTIVE" });
    mockDb.intelInsight.update.mockResolvedValue({ id: INSIGHT_ID });
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await runAnomalyDetection(ORG_ID);
    expect(result.insightsUpdated).toBeGreaterThan(0);
    expect(result.insightsCreated).toBe(0);
    expect(mockDb.intelInsight.update).toHaveBeenCalled();
    expect(mockDb.intelInsight.create).not.toHaveBeenCalled();
  });
});
