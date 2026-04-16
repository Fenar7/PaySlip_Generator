/**
 * Sprint 23.5 tests — Usage metering, rate-limit helpers, and plan config.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── PlanLimits ─────────────────────────────────────────────────────────────────

describe("PlanLimits — new metering fields", () => {
  it("free plan has bounded portal sessions, share bundles, and pixel jobs", async () => {
    const { PLAN_LIMITS } = await import("@/lib/plans/config");
    expect(PLAN_LIMITS.free.activePortalSessions).toBeGreaterThan(0);
    expect(PLAN_LIMITS.free.activeShareBundles).toBeGreaterThan(0);
    expect(PLAN_LIMITS.free.pixelJobsSaved).toBeGreaterThan(0);
  });

  it("starter plan has higher limits than free", async () => {
    const { PLAN_LIMITS } = await import("@/lib/plans/config");
    expect(PLAN_LIMITS.starter.activePortalSessions).toBeGreaterThan(
      PLAN_LIMITS.free.activePortalSessions
    );
    expect(PLAN_LIMITS.starter.pixelJobsSaved).toBeGreaterThan(PLAN_LIMITS.free.pixelJobsSaved);
  });

  it("pro plan has higher limits than starter", async () => {
    const { PLAN_LIMITS } = await import("@/lib/plans/config");
    expect(PLAN_LIMITS.pro.activePortalSessions).toBeGreaterThan(
      PLAN_LIMITS.starter.activePortalSessions
    );
  });

  it("enterprise plan returns -1 (unlimited) for metering fields", async () => {
    const { PLAN_LIMITS } = await import("@/lib/plans/config");
    expect(PLAN_LIMITS.enterprise.activePortalSessions).toBe(-1);
    expect(PLAN_LIMITS.enterprise.activeShareBundles).toBe(-1);
    expect(PLAN_LIMITS.enterprise.pixelJobsSaved).toBe(-1);
  });
});

// ── checkUsageLimit ────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    orgUsageSnapshot: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    invoice: { count: vi.fn() },
    quote: { count: vi.fn() },
    voucher: { count: vi.fn() },
    salarySlip: { count: vi.fn() },
    fileAttachment: { aggregate: vi.fn() },
    member: { count: vi.fn() },
    usageEvent: { count: vi.fn(), create: vi.fn() },
    customerPortalSession: { count: vi.fn() },
    shareBundle: { count: vi.fn() },
    pixelJobRecord: { count: vi.fn() },
  },
}));

vi.mock("@/lib/plans/enforcement", () => ({
  getOrgPlan: vi.fn(),
}));

describe("checkUsageLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns allowed=true when under limit", async () => {
    const { db } = await import("@/lib/db");
    const { getOrgPlan } = await import("@/lib/plans/enforcement");
    const { PLAN_LIMITS } = await import("@/lib/plans/config");

    vi.mocked(db.orgUsageSnapshot.findFirst).mockResolvedValue({
      id: "snap1",
      orgId: "org1",
      periodStart: new Date(),
      periodEnd: new Date(),
      activeInvoices: 3,
      activeQuotes: 0,
      vouchers: 0,
      salarySlips: 0,
      storageBytes: BigInt(0),
      teamMembers: 1,
      webhookCallsMonthly: 0,
      activePortalSessions: 2,
      activeShareBundles: 5,
      pixelJobsSaved: 10,
      lastComputedAt: new Date(),
    });

    vi.mocked(getOrgPlan).mockResolvedValue({
      planId: "starter",
      status: "active",
      limits: PLAN_LIMITS.starter,
      trialEndsAt: null,
    });

    const { checkUsageLimit } = await import("@/lib/usage-metering");
    const result = await checkUsageLimit("org1", "INVOICE");

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(3);
    expect(result.limit).toBe(PLAN_LIMITS.starter.invoicesPerMonth);
  });

  it("returns allowed=false when at or over limit", async () => {
    const { db } = await import("@/lib/db");
    const { getOrgPlan } = await import("@/lib/plans/enforcement");
    const { PLAN_LIMITS } = await import("@/lib/plans/config");

    const limit = PLAN_LIMITS.free.invoicesPerMonth;
    vi.mocked(db.orgUsageSnapshot.findFirst).mockResolvedValue({
      id: "snap2",
      orgId: "org2",
      periodStart: new Date(),
      periodEnd: new Date(),
      activeInvoices: limit,
      activeQuotes: 0,
      vouchers: 0,
      salarySlips: 0,
      storageBytes: BigInt(0),
      teamMembers: 1,
      webhookCallsMonthly: 0,
      activePortalSessions: 0,
      activeShareBundles: 0,
      pixelJobsSaved: 0,
      lastComputedAt: new Date(),
    });

    vi.mocked(getOrgPlan).mockResolvedValue({
      planId: "free",
      status: "active",
      limits: PLAN_LIMITS.free,
      trialEndsAt: null,
    });

    const { checkUsageLimit } = await import("@/lib/usage-metering");
    const result = await checkUsageLimit("org2", "INVOICE");

    expect(result.allowed).toBe(false);
    expect(result.current).toBe(limit);
    expect(result.limit).toBe(limit);
  });

  it("returns limit=null and allowed=true for enterprise (unlimited)", async () => {
    const { db } = await import("@/lib/db");
    const { getOrgPlan } = await import("@/lib/plans/enforcement");
    const { PLAN_LIMITS } = await import("@/lib/plans/config");

    vi.mocked(db.orgUsageSnapshot.findFirst).mockResolvedValue({
      id: "snap3",
      orgId: "org3",
      periodStart: new Date(),
      periodEnd: new Date(),
      activeInvoices: 9999,
      activeQuotes: 0,
      vouchers: 0,
      salarySlips: 0,
      storageBytes: BigInt(0),
      teamMembers: 50,
      webhookCallsMonthly: 0,
      activePortalSessions: 0,
      activeShareBundles: 0,
      pixelJobsSaved: 0,
      lastComputedAt: new Date(),
    });

    vi.mocked(getOrgPlan).mockResolvedValue({
      planId: "enterprise",
      status: "active",
      limits: PLAN_LIMITS.enterprise,
      trialEndsAt: null,
    });

    const { checkUsageLimit } = await import("@/lib/usage-metering");
    const result = await checkUsageLimit("org3", "INVOICE");

    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
  });

  it("triggers on-demand snapshot computation when none exists", async () => {
    const { db } = await import("@/lib/db");
    const { getOrgPlan } = await import("@/lib/plans/enforcement");
    const { PLAN_LIMITS } = await import("@/lib/plans/config");

    vi.mocked(db.orgUsageSnapshot.findFirst).mockResolvedValue(null);
    vi.mocked(db.invoice.count).mockResolvedValue(5);
    vi.mocked(db.quote.count).mockResolvedValue(0);
    vi.mocked(db.voucher.count).mockResolvedValue(0);
    vi.mocked(db.salarySlip.count).mockResolvedValue(0);
    vi.mocked(db.fileAttachment.aggregate).mockResolvedValue({ _sum: { size: null } } as never);
    vi.mocked(db.member.count).mockResolvedValue(2);
    vi.mocked(db.usageEvent.count).mockResolvedValue(0);
    vi.mocked(db.customerPortalSession.count).mockResolvedValue(0);
    vi.mocked(db.shareBundle.count).mockResolvedValue(0);
    vi.mocked(db.pixelJobRecord.count).mockResolvedValue(0);
    vi.mocked(db.orgUsageSnapshot.upsert).mockResolvedValue({} as never);

    vi.mocked(getOrgPlan).mockResolvedValue({
      planId: "pro",
      status: "active",
      limits: PLAN_LIMITS.pro,
      trialEndsAt: null,
    });

    const { checkUsageLimit } = await import("@/lib/usage-metering");
    const result = await checkUsageLimit("org4", "INVOICE");

    expect(result.current).toBe(5);
    expect(result.allowed).toBe(true);
    expect(db.orgUsageSnapshot.upsert).toHaveBeenCalledOnce();
  });
});

// ── recordUsageEvent ──────────────────────────────────────────────────────────

describe("recordUsageEvent", () => {
  it("creates a usage event with correct delta", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.usageEvent.create).mockResolvedValue({} as never);

    const { recordUsageEvent } = await import("@/lib/usage-metering");
    await recordUsageEvent("orgX", "PIXEL_JOB_SAVED", 1, "entity123");

    expect(db.usageEvent.create).toHaveBeenCalledWith({
      data: {
        orgId: "orgX",
        resource: "PIXEL_JOB_SAVED",
        delta: 1,
        entityId: "entity123",
      },
    });
  });
});

// ── RATE_LIMITS extension ─────────────────────────────────────────────────────

describe("RATE_LIMITS", () => {
  it("includes pixel and OCR rate limit presets", async () => {
    const { RATE_LIMITS } = await import("@/lib/rate-limit");
    expect(RATE_LIMITS).toHaveProperty("pixelPrintSheet");
    expect(RATE_LIMITS).toHaveProperty("ocrExtract");
    expect(RATE_LIMITS).toHaveProperty("shareTokenValidation");
    expect(RATE_LIMITS.ocrExtract.maxRequests).toBeLessThanOrEqual(10);
  });
});
