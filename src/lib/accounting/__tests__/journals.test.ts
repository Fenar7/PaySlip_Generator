import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {},
}));

import { validateJournalLines } from "../journals";

describe("validateJournalLines", () => {
  it("normalizes balanced journal lines", () => {
    const result = validateJournalLines([
      { accountId: "acc-cash", debit: 100.004, description: "  Cash receipt  " },
      { accountId: "acc-sales", credit: 100.004, description: "  Revenue  " },
    ]);

    expect(result.totalDebit).toBe(100);
    expect(result.totalCredit).toBe(100);
    expect(result.lines).toEqual([
      expect.objectContaining({
        accountId: "acc-cash",
        debit: 100,
        credit: 0,
        description: "Cash receipt",
      }),
      expect.objectContaining({
        accountId: "acc-sales",
        debit: 0,
        credit: 100,
        description: "Revenue",
      }),
    ]);
  });

  it("rejects journals with fewer than two lines", () => {
    expect(() =>
      validateJournalLines([{ accountId: "acc-cash", debit: 100 }]),
    ).toThrow("at least two lines");
  });

  it("rejects lines that contain both debit and credit", () => {
    expect(() =>
      validateJournalLines([
        { accountId: "acc-cash", debit: 100, credit: 25 },
        { accountId: "acc-sales", credit: 75 },
      ]),
    ).toThrow("either a debit or a credit");
  });

  it("rejects unbalanced journals", () => {
    expect(() =>
      validateJournalLines([
        { accountId: "acc-cash", debit: 100 },
        { accountId: "acc-sales", credit: 99.99 },
      ]),
    ).toThrow("must balance");
  });

  it("rejects zero-value journals", () => {
    expect(() =>
      validateJournalLines([
        { accountId: "acc-cash", debit: 0 },
        { accountId: "acc-sales", credit: 0 },
      ]),
    ).toThrow("either a debit or a credit");
  });
});
