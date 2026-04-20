import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    invoice: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    invoiceStateEvent: {
      create: vi.fn(),
    },
    stockEvent: {
      findMany: vi.fn(),
    },
  },
}));

// Phase 19.2: mock document-events so fire-and-forget emits don't error
vi.mock("@/lib/document-events", () => ({
  emitInvoiceEvent: vi.fn().mockResolvedValue(undefined),
  emitVoucherEvent: vi.fn().mockResolvedValue(undefined),
  emitSalarySlipEvent: vi.fn().mockResolvedValue(undefined),
  emitQuoteEvent: vi.fn().mockResolvedValue(undefined),
  createDocEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
}));

vi.mock("@/lib/docs", () => ({
  nextDocumentNumber: vi.fn(),
}));

vi.mock("@/lib/prisma-errors", () => ({
  getSchemaDriftActionMessage: vi.fn(),
  isModelMissingTableError: vi.fn().mockReturnValue(false),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/invoice-reconciliation", () => ({
  reconcileInvoicePayment: vi.fn(),
  validatePaymentAmount: vi.fn(),
}));

vi.mock("@/lib/accounting", () => ({
  postInvoiceIssueTx: vi.fn(),
  postInvoicePaymentTx: vi.fn(),
  reverseJournalEntryTx: vi.fn(),
}));

vi.mock("@/lib/docs-vault", () => ({
  syncInvoiceToIndex: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/inventory/stock-events", () => ({
  getOutboundUnitCostTx: vi.fn().mockResolvedValue(125),
  recordStockEventTx: vi.fn().mockResolvedValue(undefined),
}));

import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextDocumentNumber } from "@/lib/docs";
import { reverseJournalEntryTx } from "@/lib/accounting";
import { recordStockEventTx } from "@/lib/inventory/stock-events";
import { cancelInvoice, reissueInvoice } from "../actions";

const ORG_ID = "org-1";
const USER_ID = "user-1";

function txProxy() {
  vi.mocked(db.$transaction).mockImplementation(async (input: any) => input(db));
}

describe("invoice accounting transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txProxy();
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: ORG_ID,
      userId: USER_ID,
      role: "admin",
    });
  });

  it("reverses the posted issue journal when cancelling an unpaid posted invoice", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue({
      id: "inv-1",
      organizationId: ORG_ID,
      invoiceNumber: "INV-001",
      status: "ISSUED",
      amountPaid: 0,
      postedJournalEntryId: "journal-1",
      accountingStatus: "POSTED",
    } as any);
    vi.mocked(reverseJournalEntryTx).mockResolvedValue({
      id: "reversal-1",
    } as any);
    vi.mocked(db.stockEvent.findMany).mockResolvedValue([]);
    vi.mocked(db.invoice.update).mockResolvedValue({} as any);
    vi.mocked(db.invoiceStateEvent.create).mockResolvedValue({} as any);

    const result = await cancelInvoice("inv-1", "Customer requested cancellation");

    expect(result.success).toBe(true);
    expect(reverseJournalEntryTx).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        orgId: ORG_ID,
        journalEntryId: "journal-1",
        actorId: USER_ID,
      }),
    );
    expect(db.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: {
        status: "CANCELLED",
        accountingStatus: "REVERSED",
        revenueRecognitionStatus: "PENDING",
      },
    });
    expect(db.invoiceStateEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        invoiceId: "inv-1",
        toStatus: "CANCELLED",
        metadata: { reversalJournalId: "reversal-1" },
      }),
    });
  });

  it("blocks reissue when settled payments already exist", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue({
      id: "inv-1",
      organizationId: ORG_ID,
      invoiceNumber: "INV-001",
      status: "PAID",
      amountPaid: 2500,
      postedJournalEntryId: "journal-1",
      accountingStatus: "POSTED",
      lineItems: [],
    } as any);

    const result = await reissueInvoice("inv-1", "Rate correction");

    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toContain(
      "recorded settled payments",
    );
    expect(reverseJournalEntryTx).not.toHaveBeenCalled();
    expect(db.invoice.create).not.toHaveBeenCalled();
  });

  it("creates a replacement invoice and records reversal metadata when reissuing an unpaid posted invoice", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue({
      id: "inv-1",
      organizationId: ORG_ID,
      customerId: "cust-1",
      invoiceNumber: "INV-001",
      invoiceDate: "2026-04-01",
      dueDate: "2026-04-15",
      status: "PAID",
      amountPaid: 0,
      postedJournalEntryId: "journal-1",
      accountingStatus: "POSTED",
      notes: "Original invoice",
      formData: { template: "standard" },
      totalAmount: 1180,
      lineItems: [
        {
          description: "Consulting",
          inventoryItemId: "item-1",
          quantity: 1,
          unitPrice: 1000,
          taxRate: 18,
          discount: 0,
          amount: 1180,
          sortOrder: 0,
        },
      ],
    } as any);
    vi.mocked(nextDocumentNumber).mockResolvedValue("INV-002");
    vi.mocked(reverseJournalEntryTx).mockResolvedValue({
      id: "reversal-1",
    } as any);
    vi.mocked(db.invoice.create).mockResolvedValue({
      id: "inv-2",
    } as any);
    vi.mocked(db.invoice.update).mockResolvedValue({} as any);
    vi.mocked(db.invoiceStateEvent.create).mockResolvedValue({} as any);

    const result = await reissueInvoice("inv-1", "Correcting customer details");

    expect(result.success).toBe(true);
    expect(db.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        invoiceNumber: "INV-002",
        originalId: "inv-1",
        lineItems: {
          create: [
            expect.objectContaining({
              inventoryItemId: "item-1",
            }),
          ],
        },
      }),
    });
    expect(db.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: {
        status: "REISSUED",
        reissueReason: "Correcting customer details",
        accountingStatus: "REVERSED",
        revenueRecognitionStatus: "PENDING",
      },
    });
    expect(db.invoiceStateEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        invoiceId: "inv-1",
        toStatus: "REISSUED",
        metadata: {
          newInvoiceId: "inv-2",
          newInvoiceNumber: "INV-002",
          reversalJournalId: "reversal-1",
        },
      }),
    });
  });

  it("restores dispatched inventory when cancelling an issued invoice", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue({
      id: "inv-1",
      organizationId: ORG_ID,
      invoiceNumber: "INV-001",
      status: "ISSUED",
      amountPaid: 0,
      postedJournalEntryId: null,
      accountingStatus: "PENDING",
    } as any);
    vi.mocked(db.stockEvent.findMany).mockResolvedValue([
      {
        id: "stock-1",
        inventoryItemId: "item-1",
        warehouseId: "wh-1",
        quantity: 3,
        unitCost: 125,
      },
    ] as any);
    vi.mocked(db.invoice.update).mockResolvedValue({} as any);
    vi.mocked(db.invoiceStateEvent.create).mockResolvedValue({} as any);
    vi.mocked(db.invoice.findUnique).mockResolvedValue({
      id: "inv-1",
      organizationId: ORG_ID,
      invoiceNumber: "INV-001",
      invoiceDate: "2026-04-01",
      status: "CANCELLED",
      totalAmount: 300,
      displayCurrency: "INR",
      archivedAt: null,
      customer: null,
    } as any);

    const result = await cancelInvoice("inv-1", "Customer cancelled before fulfilment");

    expect(result.success).toBe(true);
    expect(recordStockEventTx).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        orgId: ORG_ID,
        inventoryItemId: "item-1",
        warehouseId: "wh-1",
        quantity: 3,
        eventType: "RETURN_IN",
        referenceId: "inv-1",
        createdByUserId: USER_ID,
      }),
    );
  });
});
