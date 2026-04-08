import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    invoice: { findUnique: vi.fn(), update: vi.fn() },
    paymentArrangement: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    paymentInstallment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    invoicePayment: { create: vi.fn() },
    invoiceStateEvent: { create: vi.fn() },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/invoice-reconciliation", () => ({
  reconcileInvoicePayment: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/dunning", () => ({
  stopDunningOnArrangement: vi.fn().mockResolvedValue(undefined),
  resumeDunning: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { reconcileInvoicePayment } from "@/lib/invoice-reconciliation";
import { stopDunningOnArrangement, resumeDunning } from "@/lib/dunning";
import {
  createArrangement,
  recordInstallmentPayment,
  checkOverdueInstallments,
  cancelArrangement,
  listArrangements,
} from "../payment-arrangements";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORG = "org-1";
const USER = "user-1";
const INV_ID = "inv-1";
const CUST = "cust-1";

function txProxy() {
  vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(db));
}

function tomorrow() {
  return new Date(Date.now() + 86400000);
}

function dayAfterTomorrow() {
  return new Date(Date.now() + 2 * 86400000);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("payment-arrangements service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txProxy();
  });

  // ── createArrangement ───────────────────────────────────────────────────

  describe("createArrangement", () => {
    const baseParams = {
      orgId: ORG,
      invoiceId: INV_ID,
      customerId: CUST,
      totalArranged: 1000,
      installmentCount: 2,
      createdBy: USER,
      installments: [
        { dueDate: tomorrow(), amount: 500 },
        { dueDate: dayAfterTomorrow(), amount: 500 },
      ],
    };

    const validInvoice = {
      id: INV_ID,
      organizationId: ORG,
      remainingAmount: 1000,
      status: "OVERDUE",
      arrangement: null,
    };

    beforeEach(() => {
      vi.mocked(db.invoice.findUnique).mockResolvedValue(validInvoice as any);
      vi.mocked(db.paymentArrangement.create).mockResolvedValue({
        id: "arr-1",
        installments: [],
      } as any);
      vi.mocked(db.invoice.update).mockResolvedValue({} as any);
      vi.mocked(db.invoiceStateEvent.create).mockResolvedValue({} as any);
    });

    it("creates arrangement + installments in transaction", async () => {
      const result = await createArrangement(baseParams);

      expect(result.id).toBe("arr-1");
      expect(db.$transaction).toHaveBeenCalled();
      expect(db.paymentArrangement.create).toHaveBeenCalledTimes(1);
    });

    it("validates invoice exists and belongs to org", async () => {
      vi.mocked(db.invoice.findUnique).mockResolvedValue(null);

      await expect(createArrangement(baseParams)).rejects.toThrow(
        "Invoice not found",
      );
    });

    it("validates invoice belongs to org", async () => {
      vi.mocked(db.invoice.findUnique).mockResolvedValue({
        ...validInvoice,
        organizationId: "other-org",
      } as any);

      await expect(createArrangement(baseParams)).rejects.toThrow(
        "does not belong to this organization",
      );
    });

    it("rejects if invoice already has arrangement", async () => {
      vi.mocked(db.invoice.findUnique).mockResolvedValue({
        ...validInvoice,
        arrangement: { id: "existing" },
      } as any);

      await expect(createArrangement(baseParams)).rejects.toThrow(
        "already has a payment arrangement",
      );
    });

    it("validates totalArranged <= remainingAmount", async () => {
      vi.mocked(db.invoice.findUnique).mockResolvedValue({
        ...validInvoice,
        remainingAmount: 500,
      } as any);

      await expect(
        createArrangement({ ...baseParams, totalArranged: 1000 }),
      ).rejects.toThrow("exceeds remaining balance");
    });

    it("validates installment sum = totalArranged", async () => {
      await expect(
        createArrangement({
          ...baseParams,
          installments: [
            { dueDate: tomorrow(), amount: 300 },
            { dueDate: dayAfterTomorrow(), amount: 300 },
          ],
        }),
      ).rejects.toThrow("do not match total arranged");
    });

    it("validates installment dates are chronological", async () => {
      const d1 = dayAfterTomorrow();
      const d2 = tomorrow();

      await expect(
        createArrangement({
          ...baseParams,
          installments: [
            { dueDate: d1, amount: 500 },
            { dueDate: d2, amount: 500 },
          ],
        }),
      ).rejects.toThrow("chronological order");
    });

    it("updates invoice status to ARRANGEMENT_MADE", async () => {
      await createArrangement(baseParams);

      expect(vi.mocked(db.invoice.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "ARRANGEMENT_MADE" },
        }),
      );
    });

    it("stops dunning on arrangement creation", async () => {
      await createArrangement(baseParams);

      // fire-and-forget – just check it was called
      expect(stopDunningOnArrangement).toHaveBeenCalledWith(INV_ID);
    });
  });

  // ── recordInstallmentPayment ────────────────────────────────────────────

  describe("recordInstallmentPayment", () => {
    const installment = {
      id: "inst-1",
      installmentNumber: 1,
      status: "PENDING",
      arrangement: {
        id: "arr-1",
        invoice: { id: INV_ID, organizationId: ORG },
        installments: [
          { id: "inst-1", status: "PENDING" },
          { id: "inst-2", status: "PENDING" },
        ],
      },
    };

    const paymentData = {
      amount: 500,
      paymentMethod: "bank_transfer",
      reference: "REF-001",
    };

    beforeEach(() => {
      vi.mocked(db.paymentInstallment.findUnique).mockResolvedValue(
        installment as any,
      );
      vi.mocked(db.invoicePayment.create).mockResolvedValue({
        id: "pay-1",
      } as any);
      vi.mocked(db.paymentInstallment.update).mockResolvedValue({} as any);
    });

    it("creates InvoicePayment and marks installment PAID", async () => {
      vi.mocked(db.paymentInstallment.findMany).mockResolvedValue([
        { status: "PAID" },
        { status: "PENDING" },
      ] as any);

      const result = await recordInstallmentPayment("inst-1", paymentData, USER);

      expect(result.id).toBe("pay-1");
      expect(db.invoicePayment.create).toHaveBeenCalled();
      expect(db.paymentInstallment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PAID" }),
        }),
      );
    });

    it("calls reconcileInvoicePayment", async () => {
      vi.mocked(db.paymentInstallment.findMany).mockResolvedValue([
        { status: "PAID" },
        { status: "PENDING" },
      ] as any);

      await recordInstallmentPayment("inst-1", paymentData, USER);

      expect(reconcileInvoicePayment).toHaveBeenCalledWith(INV_ID, USER);
    });

    it("rejects for non-PENDING/OVERDUE installments", async () => {
      vi.mocked(db.paymentInstallment.findUnique).mockResolvedValue({
        ...installment,
        status: "PAID",
      } as any);

      await expect(
        recordInstallmentPayment("inst-1", paymentData, USER),
      ).rejects.toThrow("Cannot record payment");
    });

    it("marks arrangement COMPLETED when all installments paid", async () => {
      vi.mocked(db.paymentInstallment.findMany).mockResolvedValue([
        { status: "PAID" },
        { status: "PAID" },
      ] as any);
      vi.mocked(db.paymentArrangement.update).mockResolvedValue({} as any);

      await recordInstallmentPayment("inst-1", paymentData, USER);

      expect(db.paymentArrangement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "COMPLETED" },
        }),
      );
    });
  });

  // ── checkOverdueInstallments ────────────────────────────────────────────

  describe("checkOverdueInstallments", () => {
    it("marks overdue PENDING installments as OVERDUE", async () => {
      vi.mocked(db.paymentInstallment.findMany).mockResolvedValue([
        {
          id: "inst-1",
          status: "PENDING",
          arrangement: {
            id: "arr-1",
            orgId: ORG,
            invoiceId: INV_ID,
            status: "ACTIVE",
          },
        },
      ] as any);
      vi.mocked(db.paymentInstallment.update).mockResolvedValue({} as any);
      vi.mocked(db.paymentInstallment.count).mockResolvedValue(1);

      const result = await checkOverdueInstallments();

      expect(result.markedOverdue).toBe(1);
      expect(db.paymentInstallment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "OVERDUE" },
        }),
      );
    });

    it("defaults arrangement when threshold exceeded", async () => {
      vi.mocked(db.paymentInstallment.findMany).mockResolvedValue([
        {
          id: "inst-1",
          status: "PENDING",
          arrangement: {
            id: "arr-1",
            orgId: ORG,
            invoiceId: INV_ID,
            status: "ACTIVE",
          },
        },
      ] as any);
      vi.mocked(db.paymentInstallment.update).mockResolvedValue({} as any);
      // overdueCount >= 2 (threshold)
      vi.mocked(db.paymentInstallment.count).mockResolvedValue(2);
      vi.mocked(db.paymentArrangement.update).mockResolvedValue({} as any);
      vi.mocked(db.invoice.update).mockResolvedValue({} as any);
      vi.mocked(db.invoiceStateEvent.create).mockResolvedValue({} as any);

      const result = await checkOverdueInstallments();

      expect(result.defaulted).toBe(1);
      expect(db.paymentArrangement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "DEFAULTED" },
        }),
      );
    });

    it("resumes dunning on default", async () => {
      vi.mocked(db.paymentInstallment.findMany).mockResolvedValue([
        {
          id: "inst-1",
          status: "PENDING",
          arrangement: {
            id: "arr-1",
            orgId: ORG,
            invoiceId: INV_ID,
            status: "ACTIVE",
          },
        },
      ] as any);
      vi.mocked(db.paymentInstallment.update).mockResolvedValue({} as any);
      vi.mocked(db.paymentInstallment.count).mockResolvedValue(2);
      vi.mocked(db.paymentArrangement.update).mockResolvedValue({} as any);
      vi.mocked(db.invoice.update).mockResolvedValue({} as any);
      vi.mocked(db.invoiceStateEvent.create).mockResolvedValue({} as any);

      await checkOverdueInstallments();

      expect(resumeDunning).toHaveBeenCalledWith(INV_ID);
    });

    it("reverts invoice status on default", async () => {
      vi.mocked(db.paymentInstallment.findMany).mockResolvedValue([
        {
          id: "inst-1",
          status: "PENDING",
          arrangement: {
            id: "arr-1",
            orgId: ORG,
            invoiceId: INV_ID,
            status: "ACTIVE",
          },
        },
      ] as any);
      vi.mocked(db.paymentInstallment.update).mockResolvedValue({} as any);
      vi.mocked(db.paymentInstallment.count).mockResolvedValue(2);
      vi.mocked(db.paymentArrangement.update).mockResolvedValue({} as any);
      vi.mocked(db.invoice.update).mockResolvedValue({} as any);
      vi.mocked(db.invoiceStateEvent.create).mockResolvedValue({} as any);

      await checkOverdueInstallments();

      expect(db.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "OVERDUE" },
        }),
      );
    });
  });

  // ── cancelArrangement ───────────────────────────────────────────────────

  describe("cancelArrangement", () => {
    const arrangement = {
      id: "arr-1",
      orgId: ORG,
      invoiceId: INV_ID,
      status: "ACTIVE",
      invoice: { id: INV_ID, status: "ARRANGEMENT_MADE", amountPaid: 0 },
      installments: [
        { id: "inst-1", status: "PAID" },
        { id: "inst-2", status: "PENDING" },
        { id: "inst-3", status: "OVERDUE" },
      ],
    };

    beforeEach(() => {
      vi.mocked(db.paymentArrangement.findUnique).mockResolvedValue(
        arrangement as any,
      );
      vi.mocked(db.paymentArrangement.update).mockResolvedValue({} as any);
      vi.mocked(db.paymentInstallment.updateMany).mockResolvedValue({} as any);
      vi.mocked(db.invoice.update).mockResolvedValue({} as any);
      vi.mocked(db.invoiceStateEvent.create).mockResolvedValue({} as any);
    });

    it("marks arrangement CANCELLED", async () => {
      await cancelArrangement("arr-1", USER);

      expect(db.paymentArrangement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "CANCELLED" },
        }),
      );
    });

    it("waives remaining PENDING/OVERDUE installments", async () => {
      await cancelArrangement("arr-1", USER);

      expect(db.paymentInstallment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ["inst-2", "inst-3"] } },
          data: { status: "WAIVED" },
        }),
      );
    });

    it("resumes dunning on cancellation", async () => {
      await cancelArrangement("arr-1", USER);

      expect(resumeDunning).toHaveBeenCalledWith(INV_ID);
    });

    it("logs audit", async () => {
      await cancelArrangement("arr-1", USER, "Customer requested");

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "arrangement.cancelled",
          entityId: "arr-1",
        }),
      );
    });
  });

  // ── listArrangements ────────────────────────────────────────────────────

  describe("listArrangements", () => {
    it("filters by org", async () => {
      vi.mocked(db.paymentArrangement.findMany).mockResolvedValue([]);

      await listArrangements(ORG);

      expect(db.paymentArrangement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: ORG },
        }),
      );
    });

    it("filters by status when provided", async () => {
      vi.mocked(db.paymentArrangement.findMany).mockResolvedValue([]);

      await listArrangements(ORG, "ACTIVE");

      expect(db.paymentArrangement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: ORG, status: "ACTIVE" },
        }),
      );
    });
  });
});
