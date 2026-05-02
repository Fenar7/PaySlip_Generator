import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  mockDb,
} = vi.hoisted(() => ({
  mockDb: {
    sequence: { findFirst: vi.fn() },
    invoice: { findMany: vi.fn() },
    voucher: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

import { previewResequence } from "../sequence-resequence";
import { SequenceNotFoundError } from "../sequence-engine-errors";

const ORG_ID = "org-1";
const SEQ_ID = "seq-inv-1";
const FORMAT = "INV/{YYYY}/{NNNNN}";

function makeSequence(overrides: Record<string, unknown> = {}) {
  return {
    id: SEQ_ID,
    organizationId: ORG_ID,
    documentType: "INVOICE",
    periodicity: "YEARLY",
    isActive: true,
    formats: [
      {
        formatString: FORMAT,
        startCounter: 1,
        counterPadding: 5,
      },
    ],
    ...overrides,
  };
}

function makeInvoice(
  id: string,
  invoiceNumber: string,
  invoiceDate: string,
  createdAt?: string,
  status: string = "ISSUED"
) {
  return {
    id,
    invoiceNumber,
    invoiceDate: new Date(invoiceDate),
    createdAt: createdAt ? new Date(createdAt) : new Date(`${invoiceDate}T10:00:00Z`),
    status,
  };
}

describe("previewResequence (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws SequenceNotFoundError when no sequence exists", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(null);

    await expect(
      previewResequence({
        orgId: ORG_ID,
        documentType: "INVOICE",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        orderBy: "document_date",
      })
    ).rejects.toThrow(SequenceNotFoundError);
  });

  it("returns empty result when no documents match", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([]);

    const result = await previewResequence({
      orgId: ORG_ID,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.totalDocuments).toBe(0);
    expect(result.mappings).toHaveLength(0);
    expect(result.sequenceId).toBe(SEQ_ID);
    expect(result.formatString).toBe(FORMAT);
  });

  it("produces deterministic renumbered mappings for valid docs", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00042", "2026-03-15"),
      makeInvoice("inv-2", "INV/2026/00099", "2026-03-16"),
      makeInvoice("inv-3", "INV/2026/00150", "2026-06-01"),
    ]);

    const result = await previewResequence({
      orgId: ORG_ID,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.totalDocuments).toBe(3);
    expect(result.summary.renumbered).toBe(3);
    expect(result.summary.unchanged).toBe(0);
    expect(result.summary.blocked).toBe(0);

    expect(result.mappings[0].oldNumber).toBe("INV/2026/00042");
    expect(result.mappings[0].proposedNumber).toBe("INV/2026/00001");
    expect(result.mappings[0].status).toBe("renumbered");
    expect(result.mappings[0].oldCounter).toBe(42);
    expect(result.mappings[0].proposedCounter).toBe(1);

    expect(result.mappings[1].proposedNumber).toBe("INV/2026/00002");
    expect(result.mappings[2].proposedNumber).toBe("INV/2026/00003");
  });

  it("marks already-canonical records as unchanged", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00001", "2026-03-15"),
      makeInvoice("inv-2", "INV/2026/00002", "2026-03-16"),
    ]);

    const result = await previewResequence({
      orgId: ORG_ID,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.unchanged).toBe(2);
    expect(result.summary.renumbered).toBe(0);
    result.mappings.forEach((m) => {
      expect(m.status).toBe("unchanged");
      expect(m.proposedNumber).toBe(m.oldNumber);
    });
  });

  it("classifies mixed unchanged and renumbered correctly", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00001", "2026-03-15"),
      makeInvoice("inv-2", "INV-WRONG", "2026-03-16"),
      makeInvoice("inv-3", "INV/2026/00003", "2026-03-17"),
      makeInvoice("inv-4", "OTHER-BAD", "2026-04-01"),
    ]);

    const result = await previewResequence({
      orgId: ORG_ID,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.totalDocuments).toBe(4);

    // inv-1: parses as counter 1, proposed = "INV/2026/00001" → unchanged
    const inv1 = result.mappings.find((m) => m.documentId === "inv-1")!;
    expect(inv1.status).toBe("unchanged");

    // inv-2: can't parse → blocked (counter doesn't advance past blocked)
    const inv2 = result.mappings.find((m) => m.documentId === "inv-2")!;
    expect(inv2.status).toBe("blocked");

    // inv-3: counter=3 but proposed counter=2 (inv-1 used 1, inv-2 blocked, so counter is 2) → renumbered
    const inv3 = result.mappings.find((m) => m.documentId === "inv-3")!;
    expect(inv3.status).toBe("renumbered");
    expect(inv3.proposedCounter).toBe(2);
    expect(inv3.proposedNumber).toBe("INV/2026/00002");

    // inv-4: can't parse → blocked
    const inv4 = result.mappings.find((m) => m.documentId === "inv-4")!;
    expect(inv4.status).toBe("blocked");
  });

  it("marks documents with unparseable numbers as blocked", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00001", "2026-03-15"),
      makeInvoice("inv-2", "TOTALLY_BROKEN", "2026-03-16"),
    ]);

    const result = await previewResequence({
      orgId: ORG_ID,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.blocked).toBe(1);

    const blocked = result.mappings.find((m) => m.documentId === "inv-2")!;
    expect(blocked.status).toBe("blocked");
    expect(blocked.proposedNumber).toBeNull();
    expect(blocked.reason).toContain("Cannot parse existing number");
  });

  it("marks documents on or before lockDate as blocked", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00001", "2026-01-15"),
      makeInvoice("inv-2", "INV/2026/00002", "2026-03-15"),
      makeInvoice("inv-3", "INV/2026/00003", "2026-06-01"),
    ]);

    const result = await previewResequence({
      orgId: ORG_ID,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
      lockDate: new Date("2026-03-01"),
    });

    // inv-1 (Jan 15) is on or before lock date → blocked
    // inv-2 (Mar 15) is after lock date → unchanged/renumbered
    // inv-3 (Jun 1) is after lock date → unchanged/renumbered

    const blockedDocs = result.mappings.filter((m) => m.status === "blocked");
    expect(blockedDocs).toHaveLength(1);
    expect(blockedDocs[0].documentId).toBe("inv-1");
    expect(blockedDocs[0].reason).toContain("lock date");
  });

  it("lockDate does not allow duplicate proposed numbers against locked docs", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00001", "2026-01-15"),
      makeInvoice("inv-2", "INV/2026/00002", "2026-01-20"),
      makeInvoice("inv-3", "INV/2026/00099", "2026-03-15"),
    ]);

    const result = await previewResequence({
      orgId: ORG_ID,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
      lockDate: new Date("2026-02-28"),
    });

    // inv-1 (Jan 15): locked, parseable counter=1 → blocked, counter advances to 2
    // inv-2 (Jan 20): locked, parseable counter=2 → blocked, counter advances to 3
    // inv-3 (Mar 15): unlocked → proposed counter starts at 3, not 1
    // Without fix: inv-3 would get counter 1 → "INV/2026/00001" which collides with locked inv-1

    const blockedDocs = result.mappings.filter((m) => m.status === "blocked");
    expect(blockedDocs).toHaveLength(2);

    const unlocked = result.mappings.find((m) => m.documentId === "inv-3")!;
    expect(unlocked.status).toBe("renumbered");
    expect(unlocked.proposedCounter).toBe(3);
    expect(unlocked.proposedNumber).toBe("INV/2026/00003");

    // Verify no duplicate proposed numbers exist in the result
    const proposedNumbers = result.mappings
      .filter((m) => m.proposedNumber !== null)
      .map((m) => m.proposedNumber);
    const uniqueProposed = new Set(proposedNumbers);
    expect(uniqueProposed.size).toBe(proposedNumbers.length);
  });

  it("respects periodicity — counter resets per yearly period", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-2025-1", "INV/2025/00042", "2025-12-15"),
      makeInvoice("inv-2025-2", "INV/2025/00099", "2025-12-20"),
      makeInvoice("inv-2026-1", "INV/2026/00001", "2026-01-05"),
      makeInvoice("inv-2026-2", "INV/2026/00002", "2026-01-10"),
    ]);

    const result = await previewResequence({
      orgId: ORG_ID,
      documentType: "INVOICE",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.totalDocuments).toBe(4);

    // 2025 period: counter starts at 1, both old numbers are renumbered
    const doc2025_1 = result.mappings.find(
      (m) => m.documentId === "inv-2025-1"
    )!;
    expect(doc2025_1.proposedNumber).toBe("INV/2025/00001");
    expect(doc2025_1.proposedCounter).toBe(1);
    expect(doc2025_1.status).toBe("renumbered");

    const doc2025_2 = result.mappings.find(
      (m) => m.documentId === "inv-2025-2"
    )!;
    expect(doc2025_2.proposedNumber).toBe("INV/2025/00002");
    expect(doc2025_2.proposedCounter).toBe(2);

    // 2026 period: counter starts at 1 (reset), already canonical → unchanged
    const doc2026_1 = result.mappings.find(
      (m) => m.documentId === "inv-2026-1"
    )!;
    expect(doc2026_1.proposedNumber).toBe("INV/2026/00001");
    expect(doc2026_1.proposedCounter).toBe(1);
    expect(doc2026_1.status).toBe("unchanged");

    const doc2026_2 = result.mappings.find(
      (m) => m.documentId === "inv-2026-2"
    )!;
    expect(doc2026_2.proposedNumber).toBe("INV/2026/00002");
    expect(doc2026_2.proposedCounter).toBe(2);
    expect(doc2026_2.status).toBe("unchanged");
  });

  it("orderBy document_date sorts by date then creation time", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-a", "OLD-AAA", "2026-06-01", "2026-06-01T14:00:00Z"),
      makeInvoice("inv-c", "OLD-CCC", "2026-06-01", "2026-06-01T16:00:00Z"),
      makeInvoice("inv-b", "OLD-BBB", "2026-06-01", "2026-06-01T15:00:00Z"),
      makeInvoice("inv-d", "OLD-DDD", "2026-05-31", "2026-05-31T10:00:00Z"),
    ]);

    const result = await previewResequence({
      orgId: ORG_ID,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    // inv-d (May 31) first, then inv-a, inv-b, inv-c (June 1, by createdAt)
    expect(result.mappings[0].documentId).toBe("inv-d");
    expect(result.mappings[1].documentId).toBe("inv-a");
    expect(result.mappings[2].documentId).toBe("inv-b");
    expect(result.mappings[3].documentId).toBe("inv-c");
  });

  it("orderBy current_number sorts by parsed counter value", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-3", "INV/2026/00003", "2026-06-03"),
      makeInvoice("inv-1", "INV/2026/00001", "2026-06-01"),
      makeInvoice("inv-2", "INV/2026/00002", "2026-06-02"),
    ]);

    const result = await previewResequence({
      orgId: ORG_ID,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "current_number",
    });

    // Sorted by parsed counter: 00001, 00002, 00003
    expect(result.mappings[0].documentId).toBe("inv-1");
    expect(result.mappings[1].documentId).toBe("inv-2");
    expect(result.mappings[2].documentId).toBe("inv-3");

    // With orderBy=current_number and canonical numbers, all should be unchanged
    expect(result.summary.unchanged).toBe(3);
  });

  it("does NOT mutate any data — only reads", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice("inv-1", "INV/2026/00001", "2026-03-15"),
    ]);

    await previewResequence({
      orgId: ORG_ID,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    // Verify only read operations were called on the mock
    expect(mockDb.sequence.findFirst).toHaveBeenCalled();
    expect(mockDb.invoice.findMany).toHaveBeenCalled();
    // No write operations should be invoked; the mock doesn't even have write methods
  });

  it("filters by orgId — no cross-org leakage", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.findMany.mockResolvedValue([]);

    await previewResequence({
      orgId: "org-wrong",
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    // Sequence query filters by the given orgId
    expect(mockDb.sequence.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-wrong",
        }),
      })
    );
  });

  it("handles voucher document type", async () => {
    mockDb.sequence.findFirst.mockResolvedValue({
      ...makeSequence(),
      documentType: "VOUCHER",
    });
    mockDb.voucher.findMany.mockResolvedValue([
      {
        id: "vch-1",
        voucherNumber: "INV/2026/00001",
        voucherDate: "2026-03-15",
        createdAt: new Date("2026-03-15T10:00:00Z"),
        status: "approved",
      },
      {
        id: "vch-2",
        voucherNumber: "INV/2026/00002",
        voucherDate: "2026-03-16",
        createdAt: new Date("2026-03-16T10:00:00Z"),
        status: "approved",
      },
    ]);

    const result = await previewResequence({
      orgId: ORG_ID,
      documentType: "VOUCHER",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.totalDocuments).toBe(2);
    // Both match the format, so they are classified (unchanged or renumbered)
    expect(result.mappings[0].status).not.toBe("blocked");
    expect(result.mappings[1].status).not.toBe("blocked");
  });

  it("voucher documents with unparseable numbers are blocked", async () => {
    mockDb.sequence.findFirst.mockResolvedValue({
      ...makeSequence(),
      documentType: "VOUCHER",
    });
    mockDb.voucher.findMany.mockResolvedValue([
      {
        id: "vch-1",
        voucherNumber: "OLD-VCH-1",
        voucherDate: "2026-03-15",
        createdAt: new Date("2026-03-15T10:00:00Z"),
        status: "approved",
      },
    ]);

    const result = await previewResequence({
      orgId: ORG_ID,
      documentType: "VOUCHER",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.blocked).toBe(1);
    const blocked = result.mappings[0];
    expect(blocked.status).toBe("blocked");
    expect(blocked.proposedNumber).toBeNull();
    expect(blocked.reason).toContain("Cannot parse existing number");
  });
});
