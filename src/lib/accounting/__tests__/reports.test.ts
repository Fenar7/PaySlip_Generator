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
  ensureBooksSetup: vi.fn(),
}));

import { db } from "@/lib/db";
import { ensureBooksSetup } from "../accounts";
import { getGeneralLedger } from "../reports";

describe("getGeneralLedger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureBooksSetup).mockResolvedValue(undefined);
    vi.mocked(db.journalLine.findMany).mockResolvedValue([
      {
        id: "line-a",
        accountId: "cash",
        lineNumber: 1,
        description: "Debit line",
        debit: 10,
        credit: 0,
        account: {
          id: "cash",
          code: "1010",
          name: "Cash",
          normalBalance: "DEBIT",
          accountType: "ASSET",
        },
        journalEntry: {
          id: "entry-1",
          entryNumber: "JE-001",
          entryDate: new Date("2026-04-01T00:00:00Z"),
          source: "MANUAL",
          sourceRef: null,
          memo: null,
        },
      },
      {
        id: "line-b",
        accountId: "cash",
        lineNumber: 1,
        description: "Credit line",
        debit: 0,
        credit: 3,
        account: {
          id: "cash",
          code: "1010",
          name: "Cash",
          normalBalance: "DEBIT",
          accountType: "ASSET",
        },
        journalEntry: {
          id: "entry-2",
          entryNumber: "JE-002",
          entryDate: new Date("2026-04-01T00:00:00Z"),
          source: "MANUAL",
          sourceRef: null,
          memo: null,
        },
      },
    ] as never);
  });

  it("uses a total ordering for general-ledger lines and preserves stable balances", async () => {
    const ledger = await getGeneralLedger("org-1", {
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });

    expect(db.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { journalEntry: { entryDate: "asc" } },
          { journalEntryId: "asc" },
          { lineNumber: "asc" },
          { id: "asc" },
        ],
      }),
    );
    expect(ledger.map((line) => line.id)).toEqual(["line-a", "line-b"]);
    expect(ledger.map((line) => line.runningBalance)).toEqual([10, 7]);
  });
});
