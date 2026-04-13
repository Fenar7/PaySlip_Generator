import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/plans/usage", () => ({
  incrementUsage: vi.fn(),
}));

vi.mock("../accounts", () => ({
  defaultNormalBalanceForType: vi.fn(),
  ensureBooksSetup: vi.fn(),
  ensureBooksSetupTx: vi.fn(),
  getRequiredSystemAccountsTx: vi.fn(),
  SYSTEM_ACCOUNT_KEYS: {
    BANK_CHARGES: "BANK_CHARGES",
    ASSETS_ROOT: "ASSETS_ROOT",
    CASH_ON_HAND: "CASH_ON_HAND",
    PRIMARY_BANK: "PRIMARY_BANK",
    PAYMENT_GATEWAY_CLEARING: "PAYMENT_GATEWAY_CLEARING",
    OPENING_BALANCE_EQUITY: "OPENING_BALANCE_EQUITY",
  },
}));

vi.mock("../journals", () => ({
  createAndPostJournalTx: vi.fn(),
}));

import { db } from "@/lib/db";
import { incrementUsage } from "@/lib/plans/usage";
import {
  confirmBankTransactionMatch,
  importBankStatement,
} from "../banking";
import { resetBooksBankingConfigForTests } from "../config";

const ORIGINAL_ENV = { ...process.env };

describe("banking reconciliation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.BANK_IMPORT_MAX_ROWS;
    delete process.env.BANK_IMPORT_MAX_FILE_SIZE_MB;
    delete process.env.RECON_MATCH_DATE_WINDOW_DAYS;
    delete process.env.RECON_MATCH_TOLERANCE_PAISE;
    resetBooksBankingConfigForTests();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
    resetBooksBankingConfigForTests();
  });

  it("rejects statement imports above the configured file size limit", async () => {
    process.env.BANK_IMPORT_MAX_FILE_SIZE_MB = "1";
    resetBooksBankingConfigForTests();

    await expect(
      importBankStatement({
        orgId: "org-1",
        actorId: "user-1",
        bankAccountId: "bank-1",
        fileName: "statement.csv",
        storageKey: "storage.csv",
        checksum: "checksum",
        csvText: "x".repeat(1024 * 1024 + 1),
        mapping: {
          dateColumn: "Date",
          descriptionColumn: "Description",
          amountColumn: "Amount",
        },
      }),
    ).rejects.toThrow("CSV file exceeds the 1 MB size limit.");
  });

  it("rejects statement imports above the configured row limit", async () => {
    process.env.BANK_IMPORT_MAX_ROWS = "1";
    resetBooksBankingConfigForTests();

    await expect(
      importBankStatement({
        orgId: "org-1",
        actorId: "user-1",
        bankAccountId: "bank-1",
        fileName: "statement.csv",
        storageKey: "storage.csv",
        checksum: "checksum",
        csvText: "Date,Description,Amount\n2026-04-01,Deposit,100\n2026-04-02,Deposit,200",
        mapping: {
          dateColumn: "Date",
          descriptionColumn: "Description",
          amountColumn: "Amount",
        },
      }),
    ).rejects.toThrow("CSV exceeds the 1 row import limit.");
  });

  it("flags duplicate rows within the same imported file", async () => {
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        bankAccount: {
          findFirst: vi.fn().mockResolvedValue({
            id: "bank-1",
            glAccountId: "gl-bank",
            mappingProfile: null,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        bankStatementImport: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "imp-1" }),
          update: vi.fn().mockResolvedValue({}),
        },
        bankTransaction: {
          findMany: vi.fn().mockResolvedValue([]),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({}),
        },
      } as never),
    );

    const result = await importBankStatement({
      orgId: "org-1",
      actorId: "user-1",
      bankAccountId: "bank-1",
      fileName: "statement.csv",
      storageKey: "storage.csv",
      checksum: "checksum",
      csvText:
        "Date,Description,Amount\n2026-04-01,Deposit,100\n2026-04-01,Deposit,100",
      mapping: {
        dateColumn: "Date",
        descriptionColumn: "Description",
        amountColumn: "Amount",
      },
    });

    expect(result.importedRows).toBe(1);
    expect(result.failedRows).toHaveLength(1);
    expect(result.failedRows[0]?.error).toBe("Duplicate row within the uploaded file.");
    expect(incrementUsage).toHaveBeenCalledWith("org-1", "statementImportsPerMonth");
  });

  it("blocks confirmed matches that exceed the remaining bank amount", async () => {
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        bankTransaction: {
          findFirst: vi.fn().mockResolvedValue({
            id: "txn-1",
            orgId: "org-1",
            amount: 100,
            txnDate: new Date("2026-04-01T00:00:00Z"),
            bankAccount: {
              id: "bank-1",
              name: "Primary Bank",
              glAccountId: "gl-bank",
              gatewayClearingAccountId: null,
            },
          }),
        },
        bankTransactionMatch: {
          findFirst: vi.fn().mockResolvedValue({
            id: "match-1",
            entityType: "INVOICE_PAYMENT",
            entityId: "payment-1",
            matchedAmount: 20,
            status: "SUGGESTED",
          }),
          aggregate: vi
            .fn()
            .mockResolvedValueOnce({ _sum: { matchedAmount: 90 } }),
        },
      } as never),
    );

    await expect(
      confirmBankTransactionMatch({
        orgId: "org-1",
        actorId: "user-1",
        bankTransactionId: "txn-1",
        matchId: "match-1",
        matchedAmount: 20,
      }),
    ).rejects.toThrow("Matched amount exceeds the remaining bank transaction amount.");
  });

  it("blocks confirmed matches that exceed the entity's remaining available amount", async () => {
    vi.mocked(db.$transaction).mockImplementation(async (callback) =>
      callback({
        bankTransaction: {
          findFirst: vi.fn().mockResolvedValue({
            id: "txn-1",
            orgId: "org-1",
            amount: 100,
            txnDate: new Date("2026-04-01T00:00:00Z"),
            bankAccount: {
              id: "bank-1",
              name: "Primary Bank",
              glAccountId: "gl-bank",
              gatewayClearingAccountId: null,
            },
          }),
        },
        bankTransactionMatch: {
          findFirst: vi.fn().mockResolvedValue({
            id: "match-1",
            entityType: "VOUCHER",
            entityId: "voucher-1",
            matchedAmount: 60,
            status: "SUGGESTED",
          }),
          aggregate: vi
            .fn()
            .mockResolvedValueOnce({ _sum: { matchedAmount: 0 } })
            .mockResolvedValueOnce({ _sum: { matchedAmount: 30 } }),
        },
        voucher: {
          findUnique: vi.fn().mockResolvedValue({
            totalAmount: 80,
          }),
        },
      } as never),
    );

    await expect(
      confirmBankTransactionMatch({
        orgId: "org-1",
        actorId: "user-1",
        bankTransactionId: "txn-1",
        matchId: "match-1",
        matchedAmount: 60,
      }),
    ).rejects.toThrow("Matched amount exceeds the available amount for the selected entity.");
  });
});
