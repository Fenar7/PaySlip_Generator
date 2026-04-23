import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("../accounts"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRequiredSystemAccountsTx: vi.fn(),
  };
});

vi.mock("../journals", () => ({
  createAndPostJournalTx: vi.fn(),
}));

import { SYSTEM_ACCOUNT_KEYS, getRequiredSystemAccountsTx } from "../accounts";
import { createAndPostJournalTx } from "../journals";
import { postSalarySlipAccrualTx } from "../posting";

describe("salary slip posting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequiredSystemAccountsTx).mockResolvedValue({
      [SYSTEM_ACCOUNT_KEYS.PAYROLL_EXPENSE]: { id: "acc-payroll-expense" },
      [SYSTEM_ACCOUNT_KEYS.PAYROLL_PAYABLE]: { id: "acc-payroll-payable" },
      [SYSTEM_ACCOUNT_KEYS.TDS_PAYABLE]: { id: "acc-tds-payable" },
    } as any);
    vi.mocked(createAndPostJournalTx).mockResolvedValue({ id: "journal-1" } as any);
  });

  it("omits zero-value payroll payable lines when deductions consume the full gross pay", async () => {
    const tx = {
      salarySlip: {
        findFirst: vi.fn().mockResolvedValue({
          id: "slip-1",
          organizationId: "org-1",
          slipNumber: "SAL-001",
          month: 4,
          year: 2026,
          status: "released",
          grossPay: 1000,
          netPay: 0,
          journalEntryId: null,
          accountingStatus: "PENDING",
          components: [{ type: "deduction", amount: 1000 }],
        }),
        update: vi.fn().mockResolvedValue({} as any),
      },
      journalEntry: {
        findUnique: vi.fn(),
      },
    };

    await postSalarySlipAccrualTx(tx as any, {
      orgId: "org-1",
      salarySlipId: "slip-1",
      actorId: "user-1",
    });

    const [, journalInput] = vi.mocked(createAndPostJournalTx).mock.calls[0];

    expect(createAndPostJournalTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            accountId: "acc-payroll-expense",
            debit: 1000,
          }),
          expect.objectContaining({
            accountId: "acc-tds-payable",
            credit: 1000,
          }),
        ],
      }),
    );
    expect(journalInput.lines).toHaveLength(2);
    expect(journalInput.lines).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: "acc-payroll-payable",
          credit: 0,
        }),
      ]),
    );
    expect(tx.salarySlip.update).toHaveBeenCalledWith({
      where: { id: "slip-1" },
      data: expect.objectContaining({
        journalEntryId: "journal-1",
        accountingStatus: "POSTED",
      }),
    });
  });
});
