import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import {
  rejectPaymentRun,
  resubmitPaymentRun,
} from "../vendor-bills";

vi.mock("@/lib/accounting/accounts", () => ({
  ensureBooksSetup: vi.fn().mockResolvedValue({ booksEnabled: true }),
  ensureBooksSetupTx: vi.fn().mockResolvedValue({ booksEnabled: true }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn((callback) => callback(db)),
    paymentRun: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    vendorBill: {
      findMany: vi.fn(),
    },
    paymentRunItem: {
      createMany: vi.fn(),
    },
    orgDefaults: {
      findUnique: vi.fn(() => Promise.resolve({ booksEnabled: true })),
    },
  },
}));

describe("Payment Run Rejection Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects payment run and sets REJECTED status", async () => {
    const mockRun = {
      id: "run-1",
      runNumber: "PR-001",
      status: "PENDING_APPROVAL",
    };

    vi.mocked(db.paymentRun.findFirst).mockResolvedValue(mockRun as any);
    vi.mocked(db.paymentRun.update).mockResolvedValue({
      ...mockRun,
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectedByUserId: "user-1",
      rejectionReason: "Insufficient documentation",
    } as any);

    await rejectPaymentRun({
      orgId: "org-1",
      paymentRunId: "run-1",
      reason: "Insufficient documentation",
      actorId: "user-1",
    });

    expect(db.paymentRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({
        status: "REJECTED",
        rejectionReason: "Insufficient documentation",
      }),
    });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "books.payment_run.rejected",
        entityType: "payment_run",
        entityId: "run-1",
      }),
    });
  });

  it("throws error when rejecting non-pending run", async () => {
    vi.mocked(db.paymentRun.findFirst).mockResolvedValue({
      id: "run-1",
      runNumber: "PR-001",
      status: "APPROVED",
    } as any);

    await expect(
      rejectPaymentRun({
        orgId: "org-1",
        paymentRunId: "run-1",
        reason: "Test",
        actorId: "user-1",
      })
    ).rejects.toThrow("Only pending approval runs can be rejected");
  });

  it("blocks self-rejection by the original requester", async () => {
    vi.mocked(db.paymentRun.findFirst).mockResolvedValue({
      id: "run-1",
      runNumber: "PR-001",
      status: "PENDING_APPROVAL",
      requestedByUserId: "user-1",
    } as any);

    await expect(
      rejectPaymentRun({
        orgId: "org-1",
        paymentRunId: "run-1",
        reason: "Test",
        actorId: "user-1",
      }),
    ).rejects.toThrow("You cannot reject a payment run that you requested.");
  });

  it("resubmits rejected payment run back to DRAFT", async () => {
    const mockRun = {
      id: "run-1",
      runNumber: "PR-001",
      status: "REJECTED",
    };

    vi.mocked(db.paymentRun.findFirst).mockResolvedValue(mockRun as any);
    vi.mocked(db.paymentRun.update).mockResolvedValue({
      ...mockRun,
      status: "DRAFT",
      rejectedAt: null,
      rejectedByUserId: null,
      rejectionReason: null,
    } as any);

    await resubmitPaymentRun({
      orgId: "org-1",
      paymentRunId: "run-1",
      actorId: "user-1",
    });

    expect(db.paymentRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: {
        status: "DRAFT",
        rejectedAt: null,
        rejectedByUserId: null,
        rejectionReason: null,
      },
    });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "books.payment_run.resubmitted",
      }),
    });
  });

  it("throws error when resubmitting non-rejected run", async () => {
    vi.mocked(db.paymentRun.findFirst).mockResolvedValue({
      id: "run-1",
      runNumber: "PR-001",
      status: "DRAFT",
    } as any);

    await expect(
      resubmitPaymentRun({
        orgId: "org-1",
        paymentRunId: "run-1",
        actorId: "user-1",
      })
    ).rejects.toThrow("Only rejected runs can be resubmitted");
  });

  it("blocks resubmission by anyone except the original requester", async () => {
    vi.mocked(db.paymentRun.findFirst).mockResolvedValue({
      id: "run-1",
      runNumber: "PR-001",
      status: "REJECTED",
      requestedByUserId: "requester-1",
    } as any);

    await expect(
      resubmitPaymentRun({
        orgId: "org-1",
        paymentRunId: "run-1",
        actorId: "other-user",
      }),
    ).rejects.toThrow("Only the original requester can resubmit this payment run.");
  });

  it("completes full reject-resubmit-approve cycle", async () => {
    // Step 1: Reject
    vi.mocked(db.paymentRun.findFirst).mockResolvedValueOnce({
      id: "run-1",
      runNumber: "PR-001",
      status: "PENDING_APPROVAL",
    } as any);

    await rejectPaymentRun({
      orgId: "org-1",
      paymentRunId: "run-1",
      reason: "Missing invoices",
      actorId: "approver-1",
    });

    expect(db.paymentRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({ status: "REJECTED" }),
    });

    // Step 2: Resubmit
    vi.mocked(db.paymentRun.findFirst).mockResolvedValueOnce({
      id: "run-1",
      runNumber: "PR-001",
      status: "REJECTED",
    } as any);

    await resubmitPaymentRun({
      orgId: "org-1",
      paymentRunId: "run-1",
      actorId: "user-1",
    });

    expect(db.paymentRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({ status: "DRAFT" }),
    });
  });
});
