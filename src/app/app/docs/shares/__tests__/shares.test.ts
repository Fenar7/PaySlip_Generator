/**
 * Sprint 22.3 — Secure Share Center Tests
 *
 * Covers: share lifecycle, IDOR org isolation, revocation, expiry,
 * bundle creation, bundle revocation, access log creation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mockDb = vi.hoisted(() => ({
  sharedDocument: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  shareBundle: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  shareBundleItem: { create: vi.fn() },
  shareAccessLog: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  orgUsageSnapshot: { findFirst: vi.fn(), upsert: vi.fn() },
  invoice: { count: vi.fn() },
  quote: { count: vi.fn() },
  voucher: { count: vi.fn() },
  salarySlip: { count: vi.fn() },
  fileAttachment: { aggregate: vi.fn() },
  member: { count: vi.fn() },
  usageEvent: { count: vi.fn(), create: vi.fn() },
  customerPortalSession: { count: vi.fn() },
  pixelJobRecord: { count: vi.fn() },
}));

const mockRequireOrgContext = vi.hoisted(() => vi.fn());
const mockRequireRole = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockGetOrgPlan = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth", () => ({
  requireOrgContext: mockRequireOrgContext,
  requireRole: mockRequireRole,
}));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/plans/enforcement", () => ({ getOrgPlan: mockGetOrgPlan }));

// ─── Imports under test ───────────────────────────────────────────────────────

import {
  createShareLink,
  listShareLinks,
  revokeShareLink,
  getShareDetail,
  createBundle,
  listBundles,
  revokeBundle,
} from "../actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORG_A = "org-aaa";
const ORG_B = "org-bbb";
const USER_ID = "00000000-0000-0000-0000-000000000001";
const ADMIN_ID = "00000000-0000-0000-0000-000000000002";

function makeShare(overrides: Record<string, unknown> = {}) {
  return {
    id: "share-1",
    orgId: ORG_A,
    docType: "invoice",
    docId: "inv-001",
    shareToken: "tok-abc",
    status: "ACTIVE",
    expiresAt: null,
    downloadAllowed: true,
    recipientEmail: null,
    recipientName: null,
    viewCount: 0,
    downloadCount: 0,
    notes: null,
    revokedAt: null,
    revokedBy: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── createShareLink ─────────────────────────────────────────────────────────

describe("createShareLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgContext.mockResolvedValue({ orgId: ORG_A, userId: USER_ID });
    mockDb.sharedDocument.create.mockResolvedValue(makeShare());
    mockDb.shareAccessLog.create.mockResolvedValue({});
    mockLogAudit.mockResolvedValue(undefined);
  });

  it("creates a share link with correct org and docType", async () => {
    const result = await createShareLink({ docType: "invoice", docId: "inv-001" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.docType).toBe("invoice");
    expect(mockDb.sharedDocument.create).toHaveBeenCalledOnce();
    const createCall = mockDb.sharedDocument.create.mock.calls[0][0];
    expect(createCall.data.orgId).toBe(ORG_A);
    expect(createCall.data.createdBy).toBe(USER_ID);
  });

  it("sets expiresAt from expiresInHours", async () => {
    await createShareLink({ docType: "invoice", docId: "inv-001", expiresInHours: 48 });
    const createCall = mockDb.sharedDocument.create.mock.calls[0][0];
    expect(createCall.data.expiresAt).toBeInstanceOf(Date);
    const diffHours = (createCall.data.expiresAt.getTime() - Date.now()) / 3600000;
    expect(diffHours).toBeGreaterThan(47);
    expect(diffHours).toBeLessThan(49);
  });

  it("writes an access log on creation", async () => {
    await createShareLink({ docType: "invoice", docId: "inv-001" });
    expect(mockDb.shareAccessLog.create).toHaveBeenCalledOnce();
  });

  it("audits share link creation", async () => {
    await createShareLink({ docType: "invoice", docId: "inv-001" });
    expect(mockLogAudit).toHaveBeenCalledOnce();
    const auditCall = mockLogAudit.mock.calls[0][0];
    expect(auditCall.action).toBe("share_link.created");
    expect(auditCall.orgId).toBe(ORG_A);
  });
});

// ─── listShareLinks ───────────────────────────────────────────────────────────

describe("listShareLinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgContext.mockResolvedValue({ orgId: ORG_A, userId: USER_ID });
  });

  it("only returns links for caller's org", async () => {
    const shares = [makeShare(), makeShare({ id: "share-2" })];
    mockDb.sharedDocument.findMany.mockResolvedValue(shares);

    const result = await listShareLinks();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(2);

    const findCall = mockDb.sharedDocument.findMany.mock.calls[0][0];
    expect(findCall.where.orgId).toBe(ORG_A);
  });

  it("never queries another org's data", async () => {
    // Simulate a different org calling the action — the org is determined
    // server-side, not from client input
    mockRequireOrgContext.mockResolvedValue({ orgId: ORG_B, userId: USER_ID });
    mockDb.sharedDocument.findMany.mockResolvedValue([]);
    await listShareLinks();

    const findCall = mockDb.sharedDocument.findMany.mock.calls[0][0];
    expect(findCall.where.orgId).toBe(ORG_B);
    expect(findCall.where.orgId).not.toBe(ORG_A);
  });
});

// ─── revokeShareLink ─────────────────────────────────────────────────────────

describe("revokeShareLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ orgId: ORG_A, userId: ADMIN_ID });
    mockDb.shareAccessLog.create.mockResolvedValue({});
    mockLogAudit.mockResolvedValue(undefined);
  });

  it("revokes an ACTIVE share link", async () => {
    mockDb.sharedDocument.findFirst.mockResolvedValue(makeShare());
    mockDb.sharedDocument.update.mockResolvedValue({});

    const result = await revokeShareLink("share-1");
    expect(result.success).toBe(true);
    expect(mockDb.sharedDocument.update).toHaveBeenCalledOnce();
    const updateCall = mockDb.sharedDocument.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe("REVOKED");
    expect(updateCall.data.revokedAt).toBeInstanceOf(Date);
  });

  it("returns error if share link not found (org scoped)", async () => {
    mockDb.sharedDocument.findFirst.mockResolvedValue(null);
    const result = await revokeShareLink("non-existent");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/not found/i);
    expect(mockDb.sharedDocument.update).not.toHaveBeenCalled();
  });

  it("prevents double-revocation", async () => {
    mockDb.sharedDocument.findFirst.mockResolvedValue(makeShare({ status: "REVOKED" }));
    const result = await revokeShareLink("share-1");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/already revoked/i);
  });

  it("org-scopes the findFirst query to prevent IDOR", async () => {
    mockDb.sharedDocument.findFirst.mockResolvedValue(null);
    await revokeShareLink("share-from-other-org");
    const findCall = mockDb.sharedDocument.findFirst.mock.calls[0][0];
    expect(findCall.where.orgId).toBe(ORG_A);
  });

  it("requires admin role", async () => {
    expect(mockRequireRole).not.toHaveBeenCalled();
    mockDb.sharedDocument.findFirst.mockResolvedValue(null);
    await revokeShareLink("share-1");
    expect(mockRequireRole).toHaveBeenCalledWith("admin");
  });

  it("writes a REVOKED access log", async () => {
    mockDb.sharedDocument.findFirst.mockResolvedValue(makeShare());
    mockDb.sharedDocument.update.mockResolvedValue({});
    await revokeShareLink("share-1");
    expect(mockDb.shareAccessLog.create).toHaveBeenCalledOnce();
    const logCall = mockDb.shareAccessLog.create.mock.calls[0][0];
    expect(logCall.data.event).toBe("REVOKED");
  });
});

// ─── getShareDetail ───────────────────────────────────────────────────────────

describe("getShareDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgContext.mockResolvedValue({ orgId: ORG_A, userId: USER_ID });
  });

  it("returns details for own org's share", async () => {
    const share = { ...makeShare(), accessLogs: [] };
    mockDb.sharedDocument.findFirst.mockResolvedValue(share);
    const result = await getShareDetail("share-1");
    expect(result.success).toBe(true);
  });

  it("returns error if share belongs to different org (IDOR)", async () => {
    mockDb.sharedDocument.findFirst.mockResolvedValue(null);
    const result = await getShareDetail("other-org-share");
    expect(result.success).toBe(false);
  });

  it("scopes findFirst to orgId", async () => {
    mockDb.sharedDocument.findFirst.mockResolvedValue(null);
    await getShareDetail("share-1");
    const call = mockDb.sharedDocument.findFirst.mock.calls[0][0];
    expect(call.where.orgId).toBe(ORG_A);
  });
});

// ─── createBundle ─────────────────────────────────────────────────────────────

describe("createBundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgContext.mockResolvedValue({ orgId: ORG_A, userId: USER_ID });
    mockLogAudit.mockResolvedValue(undefined);
    // Default: limit check passes (under limit)
    mockDb.orgUsageSnapshot.findFirst.mockResolvedValue({
      id: "snap1", orgId: ORG_A, periodStart: new Date(), periodEnd: new Date(),
      activeInvoices: 0, activeQuotes: 0, vouchers: 0, salarySlips: 0,
      storageBytes: BigInt(0), teamMembers: 1, webhookCallsMonthly: 0,
      activePortalSessions: 0, activeShareBundles: 0, pixelJobsSaved: 0,
      lastComputedAt: new Date(),
    });
    mockGetOrgPlan.mockResolvedValue({
      planId: "pro", status: "active",
      limits: { activeShareBundles: -1 } as never,
      trialEndsAt: null,
    });
  });

  it("rejects empty shareIds", async () => {
    const result = await createBundle({ title: "Test", shareIds: [] });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/at least one/i);
  });

  it("rejects shareIds that don't belong to org", async () => {
    mockDb.sharedDocument.findMany.mockResolvedValue([{ id: "share-1" }]);
    // Requested 2 but only 1 found — one belongs to another org
    const result = await createBundle({
      title: "Test",
      shareIds: ["share-1", "share-from-other-org"],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/invalid or not active/i);
  });

  it("creates bundle with correct org and items", async () => {
    mockDb.sharedDocument.findMany.mockResolvedValue([{ id: "share-1" }]);
    mockDb.shareBundle.create.mockResolvedValue({
      id: "bundle-1",
      orgId: ORG_A,
      token: "bundle-tok",
      title: "Test Bundle",
      description: null,
      status: "ACTIVE",
      expiresAt: null,
      viewCount: 0,
      downloadAllowed: true,
      recipientEmail: null,
      recipientName: null,
      createdAt: new Date(),
      _count: { items: 1 },
    });

    const result = await createBundle({ title: "Test Bundle", shareIds: ["share-1"] });
    expect(result.success).toBe(true);
    expect(mockDb.shareBundle.create).toHaveBeenCalledOnce();
    const createCall = mockDb.shareBundle.create.mock.calls[0][0];
    expect(createCall.data.orgId).toBe(ORG_A);
    expect(createCall.data.createdBy).toBe(USER_ID);
  });

  it("scopes share validation to orgId and ACTIVE status", async () => {
    mockDb.sharedDocument.findMany.mockResolvedValue([]);
    await createBundle({ title: "Test", shareIds: ["share-1"] }).catch(() => {});
    const findCall = mockDb.sharedDocument.findMany.mock.calls[0][0];
    expect(findCall.where.orgId).toBe(ORG_A);
    expect(findCall.where.status).toBe("ACTIVE");
  });
});

// ─── revokeBundle ─────────────────────────────────────────────────────────────

describe("revokeBundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ orgId: ORG_A, userId: ADMIN_ID });
    mockDb.shareAccessLog.create.mockResolvedValue({});
    mockLogAudit.mockResolvedValue(undefined);
  });

  it("revokes an ACTIVE bundle", async () => {
    mockDb.shareBundle.findFirst.mockResolvedValue({ id: "bundle-1", status: "ACTIVE" });
    mockDb.shareBundle.update.mockResolvedValue({});
    const result = await revokeBundle("bundle-1");
    expect(result.success).toBe(true);
    const updateCall = mockDb.shareBundle.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe("REVOKED");
  });

  it("returns error if bundle not found", async () => {
    mockDb.shareBundle.findFirst.mockResolvedValue(null);
    const result = await revokeBundle("non-existent");
    expect(result.success).toBe(false);
  });

  it("prevents double-revocation", async () => {
    mockDb.shareBundle.findFirst.mockResolvedValue({ id: "bundle-1", status: "REVOKED" });
    const result = await revokeBundle("bundle-1");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/already revoked/i);
  });

  it("requires admin role", async () => {
    mockDb.shareBundle.findFirst.mockResolvedValue(null);
    await revokeBundle("bundle-1");
    expect(mockRequireRole).toHaveBeenCalledWith("admin");
  });

  it("org-scopes the findFirst query to prevent IDOR", async () => {
    mockDb.shareBundle.findFirst.mockResolvedValue(null);
    await revokeBundle("bundle-other-org");
    const findCall = mockDb.shareBundle.findFirst.mock.calls[0][0];
    expect(findCall.where.orgId).toBe(ORG_A);
  });
});
