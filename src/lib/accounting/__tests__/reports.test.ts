import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    glAccount: {
      findMany: vi.fn(),
    },
    journalLine: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../accounts", () => ({
  ensureBooksSetup: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "@/lib/db";
import { ensureBooksSetup } from "../accounts";
import { getTrialBalance } from "../reports";

describe("getTrialBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives balanced totals from posted journal lines", async () => {
    vi.mocked(db.glAccount.findMany).mockResolvedValue([
      {
        id: "cash",
        code: "1100",
        name: "Cash",
        accountType: "ASSET",
        normalBalance: "DEBIT",
        isActive: true,
      },
      {
        id: "revenue",
        code: "4100",
        name: "Service Revenue",
        accountType: "INCOME",
        normalBalance: "CREDIT",
        isActive: true,
      },
    ] as any);
    vi.mocked(db.journalLine.findMany).mockResolvedValue([
      { accountId: "cash", debit: 100, credit: 0 },
      { accountId: "revenue", debit: 0, credit: 100 },
    ] as any);

    const result = await getTrialBalance("org-1");

    expect(ensureBooksSetup).toHaveBeenCalledWith("org-1");
    expect(db.journalLine.findMany).toHaveBeenCalledWith({
      where: {
        orgId: "org-1",
        journalEntry: {
          status: "POSTED",
        },
      },
      select: {
        accountId: true,
        debit: true,
        credit: true,
      },
    });
    expect(result.balanced).toBe(true);
    expect(result.totals).toEqual({ debit: 100, credit: 100 });
    expect(result.rows).toEqual([
      expect.objectContaining({
        id: "cash",
        debitBalance: 100,
        creditBalance: 0,
      }),
      expect.objectContaining({
        id: "revenue",
        debitBalance: 0,
        creditBalance: 100,
      }),
    ]);
  });

  it("surfaces contra balances on the opposite side", async () => {
    vi.mocked(db.glAccount.findMany).mockResolvedValue([
      {
        id: "cash",
        code: "1100",
        name: "Cash",
        accountType: "ASSET",
        normalBalance: "DEBIT",
        isActive: true,
      },
    ] as any);
    vi.mocked(db.journalLine.findMany).mockResolvedValue([
      { accountId: "cash", debit: 50, credit: 80 },
    ] as any);

    const result = await getTrialBalance("org-1");

    expect(result.rows).toEqual([
      expect.objectContaining({
        id: "cash",
        balance: -30,
        debitBalance: 0,
        creditBalance: 30,
      }),
    ]);
    expect(result.balanced).toBe(false);
  });
});
