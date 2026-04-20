import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    entityGroup: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    interCompanyTransfer: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/accounting/finance-reports", () => ({
  getProfitAndLoss: vi.fn(),
  getBalanceSheet: vi.fn(),
}));

vi.mock("@/lib/accounting/utils", () => ({
  roundMoney: (n: number) => Math.round(n * 100) / 100,
}));

import { db } from "@/lib/db";
import { getProfitAndLoss, getBalanceSheet } from "@/lib/accounting/finance-reports";

import {
  getConsolidatedProfitAndLoss,
  getConsolidatedBalanceSheet,
  requireGroupAdminAccess,
  requireGroupMemberAccess,
} from "../consolidation";

const mockGroup = {
  id: "group-1",
  name: "Acme Group",
  adminOrgId: "org-admin",
  adminOrg: { id: "org-admin", name: "Acme HQ" },
  members: [
    { id: "org-sub1", name: "Acme East" },
    { id: "org-sub2", name: "Acme West" },
  ],
};

const mockPLResult = {
  current: {
    income: [
      { id: "a1", code: "4000", name: "Sales", amount: 100000 },
    ],
    expenses: [
      { id: "a2", code: "5000", name: "COGS", amount: 60000 },
    ],
    netProfit: 40000,
  },
  comparison: null,
};

const mockBSResult = {
  current: {
    totalAssets: 500000,
    totalLiabilities: 200000,
    totalEquity: 300000,
  },
  comparison: null,
};

describe("requireGroupAdminAccess", () => {
  beforeEach(() => {
    vi.mocked(db.entityGroup.findUnique).mockResolvedValue(mockGroup as never);
  });

  it("resolves when caller is the group admin", async () => {
    await expect(requireGroupAdminAccess("group-1", "org-admin")).resolves.toMatchObject({
      id: "group-1",
      adminOrgId: "org-admin",
    });
  });

  it("throws when caller is not the group admin", async () => {
    await expect(requireGroupAdminAccess("group-1", "org-sub1")).rejects.toThrow(
      "Only the group admin org",
    );
  });

  it("throws when group does not exist", async () => {
    vi.mocked(db.entityGroup.findUnique).mockResolvedValue(null);
    await expect(requireGroupAdminAccess("nonexistent", "org-admin")).rejects.toThrow(
      "Entity group not found",
    );
  });
});

describe("requireGroupMemberAccess", () => {
  beforeEach(() => {
    vi.mocked(db.entityGroup.findUnique).mockResolvedValue({
      ...mockGroup,
      members: [{ id: "org-sub1" }, { id: "org-sub2" }],
    } as never);
  });

  it("resolves for the admin org", async () => {
    await expect(requireGroupMemberAccess("group-1", "org-admin")).resolves.toBeDefined();
  });

  it("resolves for a member org", async () => {
    await expect(requireGroupMemberAccess("group-1", "org-sub1")).resolves.toBeDefined();
  });

  it("throws for an org outside the group", async () => {
    await expect(requireGroupMemberAccess("group-1", "org-other")).rejects.toThrow(
      "not a member",
    );
  });
});

describe("getConsolidatedProfitAndLoss", () => {
  beforeEach(() => {
    vi.mocked(db.entityGroup.findUnique).mockResolvedValue(mockGroup as never);
    vi.mocked(getProfitAndLoss).mockResolvedValue(mockPLResult as never);
    vi.mocked(db.interCompanyTransfer.findMany).mockResolvedValue([]);
  });

  it("returns consolidated totals summed across all orgs", async () => {
    const result = await getConsolidatedProfitAndLoss("group-1");
    // 3 orgs × ₹100,000 income each
    expect(result.consolidated.totalIncome).toBe(300000);
    // 3 orgs × ₹60,000 expenses each
    expect(result.consolidated.totalExpenses).toBe(180000);
    // 300,000 - 180,000
    expect(result.consolidated.netProfit).toBe(120000);
  });

  it("deducts inter-company eliminations", async () => {
    vi.mocked(db.interCompanyTransfer.findMany).mockResolvedValue([
      { amount: 10000 },
      { amount: 5000 },
    ] as never);
    const result = await getConsolidatedProfitAndLoss("group-1");
    expect(result.consolidated.interCompanyEliminations).toBe(15000);
  });

  it("includes all entity orgs (admin + members) in breakdown", async () => {
    const result = await getConsolidatedProfitAndLoss("group-1");
    expect(result.entityBreakdown).toHaveLength(3); // admin + 2 members
  });

  it("throws when group is not found", async () => {
    vi.mocked(db.entityGroup.findUnique).mockResolvedValue(null);
    await expect(getConsolidatedProfitAndLoss("nonexistent")).rejects.toThrow(
      "Entity group not found",
    );
  });

  it("preserves the entity group name in result", async () => {
    const result = await getConsolidatedProfitAndLoss("group-1");
    expect(result.entityGroupName).toBe("Acme Group");
  });
});

describe("getConsolidatedBalanceSheet", () => {
  beforeEach(() => {
    vi.mocked(db.entityGroup.findUnique).mockResolvedValue(mockGroup as never);
    vi.mocked(getBalanceSheet).mockResolvedValue(mockBSResult as never);
    vi.mocked(db.interCompanyTransfer.findMany).mockResolvedValue([]);
  });

  it("sums assets across all entity orgs", async () => {
    const result = await getConsolidatedBalanceSheet("group-1");
    // 3 orgs × ₹500,000 each
    expect(result.consolidated.totalAssets).toBe(1500000);
  });

  it("sums liabilities across all entity orgs", async () => {
    const result = await getConsolidatedBalanceSheet("group-1");
    expect(result.consolidated.totalLiabilities).toBe(600000);
  });

  it("sums equity across all entity orgs", async () => {
    const result = await getConsolidatedBalanceSheet("group-1");
    expect(result.consolidated.totalEquity).toBe(900000);
  });

  it("counts posted ICT as eliminations", async () => {
    vi.mocked(db.interCompanyTransfer.findMany).mockResolvedValue([
      { amount: 50000 },
    ] as never);
    const result = await getConsolidatedBalanceSheet("group-1");
    expect(result.consolidated.interCompanyEliminations).toBe(50000);
    expect(result.consolidated.totalAssets).toBe(1450000);
    expect(result.consolidated.totalLiabilities).toBe(550000);
  });

  it("includes the as-of date in result", async () => {
    const result = await getConsolidatedBalanceSheet("group-1", "2025-12-31");
    expect(result.asOfDate).toBe("2025-12-31");
  });
});
