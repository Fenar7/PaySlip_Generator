import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    sequence: { findFirst: vi.fn() },
    sequencePeriod: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    invoice: { findMany: vi.fn(), update: vi.fn() },
    voucher: { findMany: vi.fn(), update: vi.fn() },
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
const FORMAT = "INV/{YYYY}/{NNNNN}";

function makeSequence() {
  return { id: SEQ_ID, organizationId: ORG_ID, documentType: "INVOICE", periodicity: "YEARLY", isActive: true, formats: [{ formatString: FORMAT, startCounter: 1, counterPadding: 5 }] };
}

function makeInvoice(id: string, invoiceNumber: string, invoiceDate: string) {
  return { id, invoiceNumber, invoiceDate: new Date(invoiceDate), createdAt: new Date(`${invoiceDate}T10:00:00Z`), status: "ISSUED" };
}

async function getPreviewFp(input: Parameters<typeof applyResequence>[0]) {
  const preview = await previewResequence(input);
  return preview.previewFingerprint;
}

function setupTransactionMock() {
  mockDb.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const txClient = { sequencePeriod: { findFirst: mockDb.sequencePeriod.findFirst, update: mockDb.sequencePeriod.update, create: mockDb.sequencePeriod.create }, invoice: { update: mockDb.invoice.update }, voucher: { update: mockDb.voucher.update } };
    return fn(txClient);
  });
}

function setupInvoiceMocks(invoices: ReturnType<typeof makeInvoice>[]) {
  mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
  mockDb.invoice.findMany.mockResolvedValue(invoices);
  mockDb.sequencePeriod.findFirst.mockResolvedValue(null);
  mockDb.sequencePeriod.create.mockResolvedValue({ id: "period-1" });
  mockDb.invoice.update.mockResolvedValue({});
}

const baseInput = {
  orgId: ORG_ID, documentType: "INVOICE" as const,
  startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), orderBy: "document_date" as const,
};
const auditParams = { actorId: "user-1" };

describe("applyResequence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogAuditTx.mockResolvedValue(undefined);
    setupTransactionMock();
  });

  it("applies renumbered documents and returns applied ids", async () => {
    setupInvoiceMocks([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"), makeInvoice("inv-2", "INV/2026/00099", "2026-03-16")]);
    const fp = await getPreviewFp(baseInput);
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"), makeInvoice("inv-2", "INV/2026/00099", "2026-03-16")]);

    const result = await applyResequence({ ...baseInput, expectedFingerprint: fp }, auditParams);
    expect(result.summary.applied).toBe(2);
  });

  it("does not mutate blocked records", async () => {
    const lockedInput = { ...baseInput, lockDate: new Date("2026-02-01") };
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2026/00001", "2026-01-15"), makeInvoice("inv-2", "INV/2026/00042", "2026-03-15")]);
    const fp = await getPreviewFp(lockedInput);
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2026/00001", "2026-01-15"), makeInvoice("inv-2", "INV/2026/00042", "2026-03-15")]);

    const result = await applyResequence({ ...lockedInput, expectedFingerprint: fp }, auditParams);
    expect(result.summary.blocked).toBe(1);
    expect(result.summary.applied).toBe(1);
    expect(result.appliedDocumentIds).toEqual(["inv-2"]);
  });

  it("does not mutate unchanged records", async () => {
    setupInvoiceMocks([makeInvoice("inv-1", "INV/2026/00001", "2026-03-15"), makeInvoice("inv-2", "INV/2026/00002", "2026-03-16")]);
    const fp = await getPreviewFp(baseInput);
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2026/00001", "2026-03-15"), makeInvoice("inv-2", "INV/2026/00002", "2026-03-16")]);

    const result = await applyResequence({ ...baseInput, expectedFingerprint: fp }, auditParams);
    expect(result.summary.applied).toBe(0);
  });

  it("updates sequence metadata on invoices", async () => {
    setupInvoiceMocks([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15")]);
    const fp = await getPreviewFp(baseInput);
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15")]);

    await applyResequence({ ...baseInput, expectedFingerprint: fp }, auditParams);
    expect(mockDb.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inv-1", organizationId: ORG_ID }, data: expect.objectContaining({ invoiceNumber: "INV/2026/00001", sequenceId: SEQ_ID, sequenceNumber: 1 }) })
    );
  });

  it("updates voucher documents", async () => {
    const vchInput = { ...baseInput, documentType: "VOUCHER" as const };
    mockDb.sequence.findFirst.mockResolvedValue({ ...makeSequence(), documentType: "VOUCHER" });
    mockDb.voucher.findMany.mockResolvedValue([{ id: "vch-1", voucherNumber: "INV/2026/00099", voucherDate: "2026-03-15", createdAt: new Date("2026-03-15T10:00:00Z"), status: "approved" }]);
    const fp = await getPreviewFp(vchInput);
    mockDb.sequence.findFirst.mockResolvedValue({ ...makeSequence(), documentType: "VOUCHER" });
    mockDb.voucher.findMany.mockResolvedValue([{ id: "vch-1", voucherNumber: "INV/2026/00099", voucherDate: "2026-03-15", createdAt: new Date("2026-03-15T10:00:00Z"), status: "approved" }]);

    const result = await applyResequence({ ...vchInput, expectedFingerprint: fp }, auditParams);
    expect(result.summary.applied).toBe(1);
    expect(mockDb.voucher.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ voucherNumber: "INV/2026/00001", sequenceId: SEQ_ID }) })
    );
  });

  it("writes audit log inside transaction", async () => {
    setupInvoiceMocks([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15")]);
    const fp = await getPreviewFp(baseInput);
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15")]);

    await applyResequence({ ...baseInput, expectedFingerprint: fp }, auditParams);
    expect(mockLogAuditTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "sequence.resequence_confirmed", entityType: "sequence" })
    );
  });

  it("rolls back transaction on update failure", async () => {
    setupInvoiceMocks([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15")]);
    const fp = await getPreviewFp(baseInput);
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15")]);
    mockDb.$transaction.mockImplementation(async () => { throw new Error("DB constraint violation"); });

    await expect(applyResequence({ ...baseInput, expectedFingerprint: fp }, auditParams)).rejects.toThrow("DB constraint violation");
    expect(mockDb.invoice.update).not.toHaveBeenCalled();
  });

  it("creates sequence periods for multiple period keys", async () => {
    const multiInput = { ...baseInput, startDate: new Date("2025-01-01"), endDate: new Date("2026-12-31") };
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"), makeInvoice("inv-2", "INV/2025/00099", "2025-06-01")]);
    const fp = await getPreviewFp(multiInput);
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"), makeInvoice("inv-2", "INV/2025/00099", "2025-06-01")]);

    const result = await applyResequence({ ...multiInput, expectedFingerprint: fp }, auditParams);
    expect(result.summary.applied).toBe(2);
    expect(mockDb.sequencePeriod.create).toHaveBeenCalledTimes(2);
  });

  it("refuses apply when fingerprint does not match", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15")]);

    await expect(
      applyResequence({ ...baseInput, expectedFingerprint: "wrong-fingerprint" }, auditParams)
    ).rejects.toThrow(SequenceEngineError);
    await expect(
      applyResequence({ ...baseInput, expectedFingerprint: "wrong-fingerprint" }, auditParams)
    ).rejects.toThrow(/Fingerprint mismatch/);
  });

  it("succeeds when fingerprint matches (deterministic)", async () => {
    setupInvoiceMocks([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"), makeInvoice("inv-2", "INV/2026/00099", "2026-03-16")]);
    const fp = await getPreviewFp(baseInput);
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"), makeInvoice("inv-2", "INV/2026/00099", "2026-03-16")]);

    const result = await applyResequence({ ...baseInput, expectedFingerprint: fp }, auditParams);
    expect(result.summary.applied).toBe(2);
  });

  it("links sequencePeriodId correctly in multi-period apply", async () => {
    const multiInput = { ...baseInput, startDate: new Date("2025-01-01"), endDate: new Date("2026-12-31") };
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2025/00042", "2025-12-15"), makeInvoice("inv-2", "INV/2026/00099", "2026-03-15")]);
    const fp = await getPreviewFp(multiInput);
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice("inv-1", "INV/2025/00042", "2025-12-15"), makeInvoice("inv-2", "INV/2026/00099", "2026-03-15")]);
    mockDb.sequencePeriod.findFirst.mockResolvedValue({ id: "period-found" });
    mockDb.invoice.update.mockResolvedValue({});

    const result = await applyResequence({ ...multiInput, expectedFingerprint: fp }, auditParams);
    expect(result.summary.applied).toBe(2);
    expect(mockDb.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sequencePeriodId: "period-found" }) })
    );
  });
});
