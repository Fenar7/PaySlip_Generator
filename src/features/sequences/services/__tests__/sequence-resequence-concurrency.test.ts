import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    sequence: { findFirst: vi.fn(), update: vi.fn() },
    sequencePeriod: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    invoice: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    voucher: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

const mockLogAuditTx = vi.fn();
vi.mock("@/lib/audit", () => ({ logAuditTx: (...args: unknown[]) => mockLogAuditTx(...args) }));

import { applyResequence, previewResequence } from "../sequence-resequence";
import { SequenceEngineError } from "../sequence-engine-errors";

const ORG_ID = "org-1";
const SEQ_ID = "seq-1";
const FORMAT_INV = "INV/{YYYY}/{NNNNN}";
const FORMAT_VCH = "VCH/{YYYY}/{NNNNN}";

function makeSequence(overrides?: { documentType?: string }) {
  return {
    id: SEQ_ID, organizationId: ORG_ID,
    documentType: overrides?.documentType ?? "INVOICE",
    periodicity: "YEARLY",
    isActive: true,
    formats: [{ formatString: overrides?.documentType === "VOUCHER" ? FORMAT_VCH : FORMAT_INV, startCounter: 1, counterPadding: 5 }],
  };
}

function makeInvoice(id: string, invoiceNumber: string, invoiceDate: string) {
  return { id, invoiceNumber, invoiceDate: new Date(invoiceDate), createdAt: new Date(`${invoiceDate}T10:00:00Z`), status: "ISSUED" };
}

function makeVoucher(id: string, voucherNumber: string, voucherDate: string) {
  return { id, voucherNumber, voucherDate, createdAt: new Date(`${voucherDate}T10:00:00Z`), status: "approved" };
}

function setupTransactionMock() {
  mockDb.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const txClient = {
      sequence: { update: mockDb.sequence.update },
      sequencePeriod: { findFirst: mockDb.sequencePeriod.findFirst, update: mockDb.sequencePeriod.update, create: mockDb.sequencePeriod.create },
      invoice: { findUnique: mockDb.invoice.findUnique, update: mockDb.invoice.update },
      voucher: { findUnique: mockDb.voucher.findUnique, update: mockDb.voucher.update },
    };
    return fn(txClient);
  });
}

const auditParams = { actorId: "user-1" };

describe("applyResequence concurrency hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogAuditTx.mockResolvedValue(undefined);
    setupTransactionMock();
  });

  it("locks the sequence row before applying changes", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"),
      makeInvoice("inv-2", "INV/2026/00099", "2026-03-16"),
    ]);
    mockDb.sequencePeriod.findFirst.mockResolvedValue(null);
    mockDb.sequencePeriod.create.mockResolvedValue({ id: "period-1" });
    mockDb.invoice.update.mockResolvedValue({});
    mockDb.sequence.update.mockResolvedValue({});

    const preview = await previewResequence({
      orgId: ORG_ID, documentType: "INVOICE",
      startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"),
      makeInvoice("inv-2", "INV/2026/00099", "2026-03-16"),
    ]);

    mockDb.invoice.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === "inv-1"
        ? { invoiceNumber: "INV/2026/00042" }
        : { invoiceNumber: "INV/2026/00099" })
    );

    const result = await applyResequence({
      orgId: ORG_ID, documentType: "INVOICE",
      startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
      orderBy: "document_date",
      expectedFingerprint: preview.previewFingerprint,
    }, auditParams);

    expect(result.summary.applied).toBe(2);
    expect(mockDb.sequence.update).toHaveBeenCalledWith({
      where: { id: SEQ_ID },
      data: { updatedAt: expect.any(Date) },
    });
    expect(mockDb.invoice.update).toHaveBeenCalledTimes(2);
  });

  it("rejects apply when document was modified since preview", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"),
    ]);
    mockDb.invoice.findUnique.mockResolvedValue({ invoiceNumber: "INV/2026/00999" });
    mockDb.sequence.update.mockResolvedValue({});

    const preview = await previewResequence({
      orgId: ORG_ID, documentType: "INVOICE",
      startDate: new Date("2026-01-01"), endDate: new Date("2026-06-30"),
      orderBy: "document_date",
    });

    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"),
    ]);

    await expect(
      applyResequence({
        orgId: ORG_ID, documentType: "INVOICE",
        startDate: new Date("2026-01-01"), endDate: new Date("2026-06-30"),
        orderBy: "document_date",
        expectedFingerprint: preview.previewFingerprint,
      }, auditParams)
    ).rejects.toThrow(SequenceEngineError);

    expect(mockDb.sequence.update).toHaveBeenCalled();
    expect(mockDb.invoice.findUnique).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      select: { invoiceNumber: true },
    });
    expect(mockDb.invoice.update).not.toHaveBeenCalled();
  });

  it("rejects apply when voucher was modified since preview", async () => {
    const voucherSeq = makeSequence({ documentType: "VOUCHER" });
    mockDb.sequence.findFirst.mockResolvedValue(voucherSeq);
    mockDb.voucher.findMany.mockResolvedValue([
      makeVoucher("v-1", "VCH/2026/00010", "2026-03-15"),
    ]);
    mockDb.voucher.findUnique.mockResolvedValue({ voucherNumber: "VCH/2026/88888" });
    mockDb.sequence.update.mockResolvedValue({});

    const preview = await previewResequence({
      orgId: ORG_ID, documentType: "VOUCHER",
      startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    mockDb.sequence.findFirst.mockResolvedValue(voucherSeq);
    mockDb.voucher.findMany.mockResolvedValue([
      makeVoucher("v-1", "VCH/2026/00010", "2026-03-15"),
    ]);

    await expect(
      applyResequence({
        orgId: ORG_ID, documentType: "VOUCHER",
        startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
        orderBy: "document_date",
        expectedFingerprint: preview.previewFingerprint,
      }, auditParams)
    ).rejects.toThrow(SequenceEngineError);
  });

  it("allows apply when document numbers still match the preview", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"),
    ]);
    mockDb.sequencePeriod.findFirst.mockResolvedValue(null);
    mockDb.sequencePeriod.create.mockResolvedValue({ id: "period-1" });
    mockDb.invoice.update.mockResolvedValue({});
    mockDb.sequence.update.mockResolvedValue({});
    mockDb.invoice.findUnique.mockResolvedValue({ invoiceNumber: "INV/2026/00042" });

    const preview = await previewResequence({
      orgId: ORG_ID, documentType: "INVOICE",
      startDate: new Date("2026-01-01"), endDate: new Date("2026-06-30"),
      orderBy: "document_date",
    });

    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"),
    ]);

    const result = await applyResequence({
      orgId: ORG_ID, documentType: "INVOICE",
      startDate: new Date("2026-01-01"), endDate: new Date("2026-06-30"),
      orderBy: "document_date",
      expectedFingerprint: preview.previewFingerprint,
    }, auditParams);

    expect(result.summary.applied).toBe(1);
    expect(mockDb.invoice.update).toHaveBeenCalled();
  });
});
