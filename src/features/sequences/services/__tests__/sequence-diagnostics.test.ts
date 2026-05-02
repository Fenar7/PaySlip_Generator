import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    sequence: { findFirst: vi.fn() },
    invoice: { findMany: vi.fn() },
    voucher: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { diagnoseSequence, previewResequence } from "../sequence-resequence";
import { SequenceEngineError, SequenceNotFoundError } from "../sequence-engine-errors";

const ORG_ID = "org-1";
const SEQ_ID = "seq-1";
const FORMAT = "INV/{YYYY}/{NNNNN}";

function makeSequence() {
  return { id: SEQ_ID, organizationId: ORG_ID, documentType: "INVOICE", periodicity: "YEARLY", isActive: true, formats: [{ formatString: FORMAT, startCounter: 1, counterPadding: 5 }] };
}

function makeInvoice(id: string, invoiceNumber: string, invoiceDate: string) {
  return { id, invoiceNumber, invoiceDate: new Date(invoiceDate), createdAt: new Date(`${invoiceDate}T10:00:00Z`), status: "ISSUED" };
}

const baseInput = {
  orgId: ORG_ID, documentType: "INVOICE" as const,
  startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
};

describe("diagnoseSequence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("detects missing counter gaps", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00001", "2026-03-15"),
      makeInvoice("inv-2", "INV/2026/00005", "2026-03-16"),
    ]);

    const result = await diagnoseSequence(baseInput);

    expect(result.summary.gaps).toBe(3); // 2, 3, 4 are missing
    expect(result.gaps[0].missingCounter).toBe(2);
    expect(result.gaps[1].missingCounter).toBe(3);
    expect(result.gaps[2].missingCounter).toBe(4);
  });

  it("reports zero gaps for consecutive counters", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00001", "2026-03-15"),
      makeInvoice("inv-2", "INV/2026/00002", "2026-03-16"),
      makeInvoice("inv-3", "INV/2026/00003", "2026-03-17"),
    ]);

    const result = await diagnoseSequence(baseInput);
    expect(result.summary.gaps).toBe(0);
    expect(result.summary.irregularities).toBe(0);
  });

  it("detects unparseable numbers as irregularities", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00001", "2026-03-15"),
      makeInvoice("inv-2", "BROKEN", "2026-03-16"),
    ]);

    const result = await diagnoseSequence(baseInput);
    expect(result.summary.irregularities).toBe(1);
    expect(result.irregularities[0].documentId).toBe("inv-2");
    expect(result.irregularities[0].severity).toBe("warning");
  });

  it("detects duplicate official numbers", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00001", "2026-03-15"),
      makeInvoice("inv-2", "INV/2026/00001", "2026-03-16"),
    ]);

    const result = await diagnoseSequence(baseInput);
    const dups = result.irregularities.filter((r) => r.issue.includes("Duplicate"));
    expect(dups.length).toBe(1);
    expect(dups[0].severity).toBe("critical");
  });

  it("detects out-of-order counters (counter-date mismatch)", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00001", "2026-03-15"),
      makeInvoice("inv-2", "INV/2026/00005", "2026-03-10"), // earlier date, larger counter
    ]);

    const result = await diagnoseSequence(baseInput);
    const ooo = result.irregularities.filter((r) => r.issue.includes("Out-of-order"));
    expect(ooo.length).toBe(1);
    expect(ooo[0].severity).toBe("warning");
  });

  it("marks locked documents as warnings", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00001", "2026-01-15"),
      makeInvoice("inv-2", "INV/2026/00002", "2026-03-15"),
    ]);

    const result = await diagnoseSequence({
      ...baseInput,
      lockDate: new Date("2026-02-01"),
    });

    const locked = result.irregularities.filter((r) => r.issue.includes("lock date"));
    expect(locked.length).toBe(1);
    expect(locked[0].documentId).toBe("inv-1");
  });

  it("respects periodicity for gap detection", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-2025-1", "INV/2025/00001", "2025-12-15"),
      makeInvoice("inv-2025-2", "INV/2025/00003", "2025-12-20"),
      makeInvoice("inv-2026-1", "INV/2026/00001", "2026-01-05"),
      makeInvoice("inv-2026-2", "INV/2026/00010", "2026-01-10"),
    ]);

    const result = await diagnoseSequence({
      ...baseInput,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2026-12-31"),
    });

    // 2025: gap at counter 2 (one gap), 2026: gaps 2-9 (nine gaps) = 10 total
    expect(result.summary.gaps).toBeGreaterThan(0);
    const gaps2025 = result.gaps.filter((g) => g.periodKey === "2025");
    const gaps2026 = result.gaps.filter((g) => g.periodKey === "2026");
    expect(gaps2025.length).toBe(1);  // missing 2
    expect(gaps2026.length).toBeGreaterThan(0);
  });

  it("filters by orgId — no cross-org leakage", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([]);

    await diagnoseSequence({ ...baseInput, orgId: "org-wrong" });

    expect(mockDb.sequence.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-wrong" }) })
    );
  });

  it("throws SequenceNotFoundError when no sequence exists", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(null);
    await expect(diagnoseSequence(baseInput)).rejects.toThrow(SequenceNotFoundError);
  });
});

describe("lock-date window enforcement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects preview when startDate is on or before lockDate", async () => {
    await expect(
      previewResequence({
        orgId: ORG_ID, documentType: "INVOICE",
        startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
        orderBy: "document_date",
        lockDate: new Date("2026-03-01"),
      })
    ).rejects.toThrow(SequenceEngineError);

    await expect(
      previewResequence({
        orgId: ORG_ID, documentType: "INVOICE",
        startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
        orderBy: "document_date",
        lockDate: new Date("2026-03-01"),
      })
    ).rejects.toThrow(/lock date/);
  });

  it("allows preview when startDate is strictly after lockDate", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([]);

    await expect(
      previewResequence({
        orgId: ORG_ID, documentType: "INVOICE",
        startDate: new Date("2026-03-02"), endDate: new Date("2026-12-31"),
        orderBy: "document_date",
        lockDate: new Date("2026-03-01"),
      })
    ).resolves.toBeDefined();
  });

  it("allows preview when startDate equals endDate and is after lockDate", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([]);

    await expect(
      previewResequence({
        orgId: ORG_ID, documentType: "INVOICE",
        startDate: new Date("2026-03-02"), endDate: new Date("2026-03-02"),
        orderBy: "document_date",
        lockDate: new Date("2026-03-01"),
      })
    ).resolves.toBeDefined();
  });

  it("allows preview with no lockDate (no enforcement)", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([]);

    await expect(
      previewResequence({
        orgId: ORG_ID, documentType: "INVOICE",
        startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
        orderBy: "document_date",
      })
    ).resolves.toBeDefined();
  });
});
