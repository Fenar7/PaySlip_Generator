import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    intelInsight: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    insightEvent: {
      create: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: mockDb }));

import {
  upsertInsight,
  listInsights,
  getInsightDetail,
  acknowledgeInsight,
  dismissInsight,
  resolveInsight,
  getInsightSummary,
  expireStaleInsights,
} from "../insights";

const ORG_ID = "org-abc";
const USER_ID = "user-123";
const INSIGHT_ID = "ins-001";

function makeInsight(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: INSIGHT_ID,
    orgId: ORG_ID,
    category: "CASH_FLOW",
    severity: "HIGH",
    status: "ACTIVE",
    title: "Test insight",
    summary: "Summary",
    evidence: { items: [] },
    dedupeKey: "cash_flow:high:test",
    sourceType: "RULE",
    sourceRecordType: null,
    sourceRecordId: null,
    recommendedActionType: "review",
    assignedRole: null,
    firstDetectedAt: new Date("2024-01-01"),
    lastDetectedAt: new Date("2024-01-02"),
    expiresAt: null,
    acknowledgedAt: null,
    resolvedAt: null,
    dismissedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── upsertInsight ──────────────────────────────────────────────────────────────

describe("upsertInsight", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new insight when dedupe key is not found", async () => {
    mockDb.intelInsight.findFirst.mockResolvedValue(null);
    mockDb.intelInsight.create.mockResolvedValue(makeInsight());
    mockDb.insightEvent.create.mockResolvedValue({});

    await upsertInsight({
      orgId: ORG_ID,
      category: "CASH_FLOW",
      severity: "HIGH",
      title: "Test insight",
      summary: "Summary",
      dedupeKey: "cash_flow:high:test",
      sourceType: "RULE",
    });

    expect(mockDb.intelInsight.create).toHaveBeenCalledOnce();
    expect(mockDb.intelInsight.update).not.toHaveBeenCalled();
  });

  it("refreshes an existing ACTIVE insight on dedupe key collision", async () => {
    mockDb.intelInsight.findFirst.mockResolvedValue(makeInsight({ status: "ACTIVE" }));
    mockDb.intelInsight.update.mockResolvedValue(makeInsight({ lastDetectedAt: new Date() }));
    mockDb.insightEvent.create.mockResolvedValue({});

    await upsertInsight({
      orgId: ORG_ID,
      category: "CASH_FLOW",
      severity: "HIGH",
      title: "Test insight updated",
      summary: "New summary",
      dedupeKey: "cash_flow:high:test",
      sourceType: "RULE",
    });

    expect(mockDb.intelInsight.update).toHaveBeenCalledOnce();
    expect(mockDb.intelInsight.create).not.toHaveBeenCalled();
  });

  it("creates a new insight when existing insight is RESOLVED (not refreshed)", async () => {
    mockDb.intelInsight.findFirst.mockResolvedValue(makeInsight({ status: "RESOLVED" }));
    mockDb.intelInsight.create.mockResolvedValue(makeInsight());
    mockDb.insightEvent.create.mockResolvedValue({});

    await upsertInsight({
      orgId: ORG_ID,
      category: "CASH_FLOW",
      severity: "HIGH",
      title: "Test insight",
      summary: "Summary",
      dedupeKey: "cash_flow:high:test",
      sourceType: "RULE",
    });

    expect(mockDb.intelInsight.create).toHaveBeenCalledOnce();
  });

  it("creates a new insight when existing insight is DISMISSED", async () => {
    mockDb.intelInsight.findFirst.mockResolvedValue(makeInsight({ status: "DISMISSED" }));
    mockDb.intelInsight.create.mockResolvedValue(makeInsight());
    mockDb.insightEvent.create.mockResolvedValue({});

    await upsertInsight({
      orgId: ORG_ID,
      category: "CASH_FLOW",
      severity: "HIGH",
      title: "Test insight",
      summary: "Summary",
      dedupeKey: "cash_flow:high:test",
      sourceType: "RULE",
    });

    expect(mockDb.intelInsight.create).toHaveBeenCalledOnce();
  });
});

// ── listInsights ───────────────────────────────────────────────────────────────

describe("listInsights", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by orgId only — no cross-org leakage", async () => {
    mockDb.intelInsight.findMany.mockResolvedValue([]);

    await listInsights(ORG_ID, {});

    const call = mockDb.intelInsight.findMany.mock.calls[0][0];
    expect(call.where.orgId).toBe(ORG_ID);
  });

  it("applies status filter", async () => {
    mockDb.intelInsight.findMany.mockResolvedValue([]);

    await listInsights(ORG_ID, { status: ["ACTIVE"] });

    const call = mockDb.intelInsight.findMany.mock.calls[0][0];
    expect(call.where.status?.in).toEqual(["ACTIVE"]);
  });

  it("sorts by severity weight descending (CRITICAL before INFO)", async () => {
    const critical = makeInsight({ severity: "CRITICAL", id: "ins-critical" });
    const info = makeInsight({ severity: "INFO", id: "ins-info" });
    mockDb.intelInsight.findMany.mockResolvedValue([info, critical]);

    const result = await listInsights(ORG_ID, {});

    // CRITICAL (weight 5) should come before INFO (weight 1)
    expect(result[0].severity).toBe("CRITICAL");
    expect(result[1].severity).toBe("INFO");
  });
});

// ── acknowledgeInsight ─────────────────────────────────────────────────────────

describe("acknowledgeInsight", () => {
  beforeEach(() => vi.clearAllMocks());

  it("acknowledges ACTIVE insight successfully", async () => {
    mockDb.intelInsight.findFirst.mockResolvedValue(makeInsight({ status: "ACTIVE" }));
    mockDb.intelInsight.update.mockResolvedValue(makeInsight({ status: "ACKNOWLEDGED" }));
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await acknowledgeInsight(ORG_ID, INSIGHT_ID, USER_ID);
    expect(result.success).toBe(true);
    expect(mockDb.insightEvent.create).toHaveBeenCalledOnce();
  });

  it("rejects acknowledgement if insight is already RESOLVED", async () => {
    mockDb.intelInsight.findFirst.mockResolvedValue(makeInsight({ status: "RESOLVED" }));

    const result = await acknowledgeInsight(ORG_ID, INSIGHT_ID, USER_ID);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/RESOLVED/);
  });

  it("rejects acknowledgement if insight not found in org", async () => {
    mockDb.intelInsight.findFirst.mockResolvedValue(null);

    const result = await acknowledgeInsight(ORG_ID, INSIGHT_ID, USER_ID);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

// ── dismissInsight ─────────────────────────────────────────────────────────────

describe("dismissInsight", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dismisses ACTIVE insight with optional reason", async () => {
    mockDb.intelInsight.findFirst.mockResolvedValue(makeInsight({ status: "ACTIVE" }));
    mockDb.intelInsight.update.mockResolvedValue(makeInsight({ status: "DISMISSED" }));
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await dismissInsight(ORG_ID, INSIGHT_ID, USER_ID, "Not relevant");
    expect(result.success).toBe(true);
  });

  it("rejects dismiss of RESOLVED insight", async () => {
    mockDb.intelInsight.findFirst.mockResolvedValue(makeInsight({ status: "RESOLVED" }));

    const result = await dismissInsight(ORG_ID, INSIGHT_ID, USER_ID);
    expect(result.success).toBe(false);
  });
});

// ── resolveInsight ─────────────────────────────────────────────────────────────

describe("resolveInsight", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves ACKNOWLEDGED insight", async () => {
    mockDb.intelInsight.findFirst.mockResolvedValue(makeInsight({ status: "ACKNOWLEDGED" }));
    mockDb.intelInsight.update.mockResolvedValue(makeInsight({ status: "RESOLVED" }));
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await resolveInsight(ORG_ID, INSIGHT_ID, USER_ID);
    expect(result.success).toBe(true);
  });

  it("resolves ACTIVE insight directly", async () => {
    mockDb.intelInsight.findFirst.mockResolvedValue(makeInsight({ status: "ACTIVE" }));
    mockDb.intelInsight.update.mockResolvedValue(makeInsight({ status: "RESOLVED" }));
    mockDb.insightEvent.create.mockResolvedValue({});

    const result = await resolveInsight(ORG_ID, INSIGHT_ID, USER_ID);
    expect(result.success).toBe(true);
  });

  it("rejects resolve of DISMISSED insight", async () => {
    mockDb.intelInsight.findFirst.mockResolvedValue(makeInsight({ status: "DISMISSED" }));

    const result = await resolveInsight(ORG_ID, INSIGHT_ID, USER_ID);
    expect(result.success).toBe(false);
  });
});

// ── getInsightSummary ──────────────────────────────────────────────────────────

describe("getInsightSummary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns per-severity counts scoped to org", async () => {
    mockDb.intelInsight.groupBy.mockResolvedValue([
      { severity: "CRITICAL", _count: { id: 2 } },
      { severity: "HIGH", _count: { id: 5 } },
    ]);

    const result = await getInsightSummary(ORG_ID);
    expect(result.bySeverity.CRITICAL).toBe(2);
    expect(result.bySeverity.HIGH).toBe(5);
    expect(result.bySeverity.INFO).toBe(0);
    expect(result.total).toBe(7);
  });
});

// ── expireStaleInsights — status filter regression ─────────────────────────────

describe("expireStaleInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateMany with exactly [ACTIVE, ACKNOWLEDGED] — no duplicates", async () => {
    mockDb.intelInsight.updateMany.mockResolvedValue({ count: 3 });

    const count = await expireStaleInsights(ORG_ID);

    expect(count).toBe(3);
    expect(mockDb.intelInsight.updateMany).toHaveBeenCalledOnce();
    const callArgs = mockDb.intelInsight.updateMany.mock.calls[0][0];
    const statusFilter: string[] = callArgs.where.status.in;
    // Must contain both eligible statuses
    expect(statusFilter).toContain("ACTIVE");
    expect(statusFilter).toContain("ACKNOWLEDGED");
    // Must NOT have duplicates
    const unique = [...new Set(statusFilter)];
    expect(statusFilter.length).toBe(unique.length);
    // Must NOT include EXPIRED (would be a no-op for EXPIRED rows)
    expect(statusFilter).not.toContain("EXPIRED");
  });

  it("returns the count of affected records", async () => {
    mockDb.intelInsight.updateMany.mockResolvedValue({ count: 7 });

    const count = await expireStaleInsights(ORG_ID);

    expect(count).toBe(7);
  });

  it("scopes the update to the correct org", async () => {
    mockDb.intelInsight.updateMany.mockResolvedValue({ count: 0 });

    await expireStaleInsights(ORG_ID);

    expect(mockDb.intelInsight.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ orgId: ORG_ID }) }),
    );
  });
});
