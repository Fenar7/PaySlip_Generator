import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const {
  mockDb,
  createMarketplacePayoutEvent,
  getMarketplacePayoutBeneficiarySummary,
} = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
    marketplaceRevenue: {
      findMany: vi.fn(),
    },
  },
  createMarketplacePayoutEvent: vi.fn(),
  getMarketplacePayoutBeneficiarySummary: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@/lib/env", () => ({
  env: {
    MARKETPLACE_PAYOUT_PROVIDER: "manual",
    MARKETPLACE_PAYOUT_SETTLEMENT_HOLD_DAYS: "7",
  },
}));

vi.mock("../events", () => ({
  createMarketplacePayoutEvent,
}));

vi.mock("../beneficiary", () => ({
  getMarketplacePayoutBeneficiarySummary,
}));

import {
  buildMarketplacePayoutRun,
  executeMarketplacePayoutRun,
  getPublisherPayoutSummary,
  recordMarketplacePayoutItemPaid,
} from "../runs";

describe("payout runs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => undefined);

  it("summarizes publisher payout balances by stored revenue status", async () => {
    getMarketplacePayoutBeneficiarySummary.mockResolvedValue({
      id: "ben-1",
      publisherOrgId: "org-1",
      accountHolderName: "Publisher One",
      payoutMethod: "bank_transfer",
      bankAccountMasked: "****1111",
      status: "verified",
      providerName: null,
      providerBeneficiaryId: null,
      verifiedAt: null,
      updatedAt: new Date("2026-03-10T00:00:00.000Z").toISOString(),
    });

    mockDb.marketplaceRevenue.findMany.mockResolvedValue([
      {
        publisherShare: new Prisma.Decimal(300),
        status: "pending",
        paidOutAt: null,
      },
      {
        publisherShare: new Prisma.Decimal(200),
        status: "on_hold",
        paidOutAt: null,
      },
      {
        publisherShare: new Prisma.Decimal(500),
        status: "paid",
        paidOutAt: new Date("2026-03-12T00:00:00.000Z"),
      },
      {
        publisherShare: new Prisma.Decimal(100),
        status: "failed",
        paidOutAt: null,
      },
    ]);

    const summary = await getPublisherPayoutSummary("org-1");

    expect(summary.totalEarned).toBe(1100);
    expect(summary.amountPending).toBe(300);
    expect(summary.amountOnHold).toBe(200);
    expect(summary.amountPaid).toBe(500);
    expect(summary.amountFailed).toBe(100);
    expect(summary.lastPaidAt).toBe("2026-03-12T00:00:00.000Z");
  });

  it("builds a payout run only from currently eligible revenue", async () => {
    const tx = {
      marketplaceRevenue: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "rev-eligible",
            publisherOrgId: "org-1",
            publisherShare: new Prisma.Decimal(700),
            status: "pending",
            createdAt: new Date("2026-03-01T00:00:00.000Z"),
            queuedAt: null,
            paidOutAt: null,
            onHoldReason: null,
            failureReason: null,
            purchase: {
              status: "COMPLETED",
              createdAt: new Date("2026-03-01T00:00:00.000Z"),
              template: {
                id: "tpl-1",
                name: "Invoice Pack",
                status: "PUBLISHED",
              },
            },
            publisherOrg: {
              id: "org-1",
              name: "Publisher One",
              marketplacePayoutBeneficiary: {
                id: "ben-1",
                status: "verified",
              },
            },
          },
          {
            id: "rev-pending",
            publisherOrgId: "org-2",
            publisherShare: new Prisma.Decimal(500),
            status: "pending",
            createdAt: new Date("2026-03-01T00:00:00.000Z"),
            queuedAt: null,
            paidOutAt: null,
            onHoldReason: null,
            failureReason: null,
            purchase: {
              status: "COMPLETED",
              createdAt: new Date("2026-03-01T00:00:00.000Z"),
              template: {
                id: "tpl-2",
                name: "Salary Pack",
                status: "PUBLISHED",
              },
            },
            publisherOrg: {
              id: "org-2",
              name: "Publisher Two",
              marketplacePayoutBeneficiary: {
                id: "ben-2",
                status: "pending_verification",
              },
            },
          },
        ]),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      marketplacePayoutItem: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      marketplacePayoutRun: {
        create: vi.fn().mockResolvedValue({ id: "run-1" }),
        findUnique: vi.fn().mockResolvedValue({
          id: "run-1",
          runNumber: "MPR-20260312-ABCDEF",
          status: "draft",
          providerName: "manual",
          totalAmount: new Prisma.Decimal(700),
          itemCount: 1,
          successCount: 0,
          failureCount: 0,
          manualReviewCount: 0,
          notes: null,
          createdAt: new Date("2026-03-12T00:00:00.000Z"),
          approvedAt: null,
          executedAt: null,
          completedAt: null,
          failedAt: null,
          items: [
            {
              id: "item-1",
              amount: new Prisma.Decimal(700),
              status: "pending",
              attemptCount: 0,
              externalReferenceId: null,
              providerReferenceId: null,
              failureMessage: null,
              manualReviewReason: null,
              settledAt: null,
              beneficiary: { status: "verified" },
              revenue: {
                status: "queued_for_payout",
                purchase: {
                  template: {
                    id: "tpl-1",
                    name: "Invoice Pack",
                  },
                },
              },
              publisherOrg: {
                id: "org-1",
                name: "Publisher One",
              },
            },
          ],
        }),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    mockDb.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    const run = await buildMarketplacePayoutRun({
      actorId: "finance-1",
    });

    expect(tx.marketplaceRevenue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          payoutItems: { none: {} },
        }),
      }),
    );
    expect(tx.marketplacePayoutRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          itemCount: 1,
          totalAmount: 700,
        }),
      }),
    );
    expect(tx.marketplaceRevenue.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "rev-eligible",
          status: "eligible",
        },
        data: expect.objectContaining({
          status: "queued_for_payout",
        }),
      }),
    );
    expect(run.itemCount).toBe(1);
    expect(run.items[0]?.publisherOrgName).toBe("Publisher One");
  });

  it("does not create a run when another builder claims the eligible revenue first", async () => {
    const tx = {
      marketplaceRevenue: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "rev-eligible",
            publisherOrgId: "org-1",
            publisherShare: new Prisma.Decimal(700),
            status: "eligible",
            createdAt: new Date("2026-03-01T00:00:00.000Z"),
            queuedAt: null,
            paidOutAt: null,
            onHoldReason: null,
            failureReason: null,
            purchase: {
              status: "COMPLETED",
              createdAt: new Date("2026-03-01T00:00:00.000Z"),
              template: {
                id: "tpl-1",
                name: "Invoice Pack",
                status: "PUBLISHED",
              },
            },
            publisherOrg: {
              id: "org-1",
              name: "Publisher One",
              marketplacePayoutBeneficiary: {
                id: "ben-1",
                status: "verified",
              },
            },
          },
        ]),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      marketplacePayoutItem: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      marketplacePayoutRun: {
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    mockDb.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await expect(
      buildMarketplacePayoutRun({
        actorId: "finance-1",
      }),
    ).rejects.toThrow(
      "Another payout run may have already claimed the available items.",
    );

    expect(tx.marketplacePayoutRun.create).not.toHaveBeenCalled();
  });

  it("keeps ambiguous provider outcomes in manual review instead of marking them paid", async () => {
    const prepareTx = {
      marketplacePayoutRun: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "run-1",
            runNumber: "MPR-20260312-ABCDEF",
            status: "approved",
            executedAt: null,
          })
          .mockResolvedValueOnce({
            status: "processing",
            itemCount: 1,
            items: [{ status: "processing" }],
          }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({}),
      },
      marketplacePayoutItem: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([
            {
              id: "item-1",
              payoutRunId: "run-1",
              revenueId: "rev-1",
              publisherOrgId: "org-1",
              amount: new Prisma.Decimal(700),
              status: "pending",
              attemptCount: 0,
              beneficiary: {
                id: "ben-1",
                status: "verified",
                payoutMethod: "bank_transfer",
                accountHolderName: "Publisher One",
                bankAccountLast4: "1234",
                providerBeneficiaryId: null,
              },
              revenue: {
                id: "rev-1",
                publisherOrgId: "org-1",
                status: "queued_for_payout",
                createdAt: new Date("2026-03-01T00:00:00.000Z"),
                queuedAt: new Date("2026-03-12T02:00:00.000Z"),
                paidOutAt: null,
                onHoldReason: null,
                failureReason: null,
                purchase: {
                  status: "COMPLETED",
                  createdAt: new Date("2026-03-01T00:00:00.000Z"),
                  template: {
                    status: "PUBLISHED",
                  },
                },
              },
            },
          ])
          .mockResolvedValueOnce([{ publisherOrgId: "org-1" }]),
        update: vi.fn().mockResolvedValue({}),
      },
      marketplacePayoutAttempt: {
        create: vi.fn().mockResolvedValue({ id: "attempt-1" }),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    const applyTx = {
      marketplacePayoutItem: {
        findUnique: vi.fn().mockResolvedValue({
          id: "item-1",
          payoutRunId: "run-1",
          revenueId: "rev-1",
          publisherOrgId: "org-1",
          status: "processing",
          revenue: {
            id: "rev-1",
            publisherOrgId: "org-1",
            status: "queued_for_payout",
          },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      marketplacePayoutAttempt: {
        update: vi.fn().mockResolvedValue({}),
      },
      marketplaceRevenue: {
        update: vi.fn(),
      },
      marketplacePayoutRun: {
        findUnique: vi.fn().mockResolvedValue({
          status: "processing",
          itemCount: 1,
          items: [{ status: "manual_review" }],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    const detailTx = {
      marketplacePayoutRun: {
        findUnique: vi.fn().mockResolvedValue({
          id: "run-1",
          runNumber: "MPR-20260312-ABCDEF",
          status: "processing",
          providerName: "manual",
          totalAmount: new Prisma.Decimal(700),
          itemCount: 1,
          successCount: 0,
          failureCount: 0,
          manualReviewCount: 1,
          notes: null,
          createdAt: new Date("2026-03-12T00:00:00.000Z"),
          approvedAt: new Date("2026-03-12T01:00:00.000Z"),
          executedAt: new Date("2026-03-12T02:00:00.000Z"),
          completedAt: null,
          failedAt: null,
          items: [
            {
              id: "item-1",
              amount: new Prisma.Decimal(700),
              status: "manual_review",
              attemptCount: 1,
              externalReferenceId: null,
              providerReferenceId: null,
              failureMessage:
                "Manual payout confirmation is required before this settlement can be marked paid.",
              manualReviewReason:
                "Manual payout confirmation is required before this settlement can be marked paid.",
              settledAt: null,
              beneficiary: { status: "verified" },
              revenue: {
                status: "queued_for_payout",
                purchase: {
                  template: {
                    id: "tpl-1",
                    name: "Invoice Pack",
                  },
                },
              },
              publisherOrg: {
                id: "org-1",
                name: "Publisher One",
              },
            },
          ],
        }),
      },
    };

    let call = 0;
    mockDb.$transaction.mockImplementation(async (callback) => {
      call += 1;
      if (call === 1) {
        return callback(prepareTx as never);
      }
      if (call === 2) {
        return callback(applyTx as never);
      }
      return callback(detailTx as never);
    });

    const run = await executeMarketplacePayoutRun({
      payoutRunId: "run-1",
      actorId: "finance-1",
    });

    expect(prepareTx.marketplacePayoutAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idempotencyKey: expect.any(String),
        }),
      }),
    );
    expect(applyTx.marketplacePayoutAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "manual_review",
        }),
      }),
    );
    expect(applyTx.marketplacePayoutItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "manual_review",
        }),
      }),
    );
    expect(applyTx.marketplaceRevenue.update).not.toHaveBeenCalled();
    expect(run.status).toBe("processing");
    expect(run.items[0]?.status).toBe("manual_review");
  });

  it("fails queued items that are no longer payout-safe before dispatching the provider", async () => {
    const prepareTx = {
      marketplacePayoutRun: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "run-1",
            runNumber: "MPR-20260312-ABCDEF",
            status: "approved",
            executedAt: null,
          })
          .mockResolvedValueOnce({
            status: "processing",
            itemCount: 1,
            items: [{ status: "failed" }],
          }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({}),
      },
      marketplacePayoutItem: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([
            {
              id: "item-1",
              payoutRunId: "run-1",
              revenueId: "rev-1",
              publisherOrgId: "org-1",
              amount: new Prisma.Decimal(700),
              status: "pending",
              attemptCount: 0,
              beneficiary: {
                id: "ben-1",
                status: "pending_verification",
                payoutMethod: "bank_transfer",
                accountHolderName: "Publisher One",
                bankAccountLast4: "1234",
                providerBeneficiaryId: null,
              },
              revenue: {
                id: "rev-1",
                publisherOrgId: "org-1",
                status: "queued_for_payout",
                createdAt: new Date("2026-03-01T00:00:00.000Z"),
                queuedAt: new Date("2026-03-12T02:00:00.000Z"),
                paidOutAt: null,
                onHoldReason: null,
                failureReason: null,
                purchase: {
                  status: "COMPLETED",
                  createdAt: new Date("2026-03-01T00:00:00.000Z"),
                  template: {
                    status: "PUBLISHED",
                  },
                },
              },
            },
          ])
          .mockResolvedValueOnce([{ publisherOrgId: "org-1" }]),
        update: vi.fn().mockResolvedValue({}),
      },
      marketplacePayoutAttempt: {
        create: vi.fn(),
      },
      marketplaceRevenue: {
        update: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    mockDb.$transaction.mockImplementation(async (callback) =>
      callback(prepareTx as never),
    );

    await expect(
      executeMarketplacePayoutRun({
        payoutRunId: "run-1",
        actorId: "finance-1",
      }),
    ).rejects.toThrow(
      "This payout run no longer has any executable items. Refresh beneficiary eligibility and rebuild the run before trying again.",
    );

    expect(prepareTx.marketplacePayoutAttempt.create).not.toHaveBeenCalled();
    expect(prepareTx.marketplaceRevenue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rev-1" },
        data: expect.objectContaining({
          status: "pending",
          queuedAt: null,
        }),
      }),
    );
    expect(prepareTx.marketplacePayoutItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({
          status: "failed",
          failureCode: "payout_revalidation_required",
        }),
      }),
    );
  });

  it("rejects duplicate execution once another worker has already claimed the run", async () => {
    const tx = {
      marketplacePayoutRun: {
        findUnique: vi.fn().mockResolvedValue({
          id: "run-1",
          runNumber: "MPR-20260312-ABCDEF",
          status: "approved",
          executedAt: null,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    mockDb.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await expect(
      executeMarketplacePayoutRun({
        payoutRunId: "run-1",
        actorId: "finance-1",
      }),
    ).rejects.toThrow("This payout run is already being processed.");
  });

  it("blocks manual paid resolution before execution has moved an item into a resolvable state", async () => {
    const tx = {
      marketplacePayoutItem: {
        findUnique: vi.fn().mockResolvedValue({
          id: "item-1",
          payoutRunId: "run-1",
          revenueId: "rev-1",
          publisherOrgId: "org-1",
          status: "pending",
          revenue: {
            id: "rev-1",
            publisherOrgId: "org-1",
            status: "queued_for_payout",
          },
          payoutRun: {
            id: "run-1",
            status: "approved",
          },
        }),
      },
    };

    mockDb.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await expect(
      recordMarketplacePayoutItemPaid({
        payoutRunId: "run-1",
        payoutItemId: "item-1",
        actorId: "finance-1",
        externalReferenceId: "bank-ref-1",
      }),
    ).rejects.toThrow(
      "Manual paid resolution is only allowed for failed or manual-review payout items after execution has started.",
    );
  });

  it("rejects concurrent manual paid resolution after another actor has already claimed the item", async () => {
    const tx = {
      marketplacePayoutItem: {
        findUnique: vi.fn().mockResolvedValue({
          id: "item-1",
          payoutRunId: "run-1",
          revenueId: "rev-1",
          publisherOrgId: "org-1",
          status: "manual_review",
          revenue: {
            id: "rev-1",
            publisherOrgId: "org-1",
            status: "queued_for_payout",
          },
          payoutRun: {
            id: "run-1",
            status: "processing",
          },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    mockDb.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    await expect(
      recordMarketplacePayoutItemPaid({
        payoutRunId: "run-1",
        payoutItemId: "item-1",
        actorId: "finance-1",
        externalReferenceId: "bank-ref-1",
      }),
    ).rejects.toThrow("This payout item is already being updated.");
  });
});
