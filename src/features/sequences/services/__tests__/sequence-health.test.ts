import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    sequence: { findFirst: vi.fn() },
    invoice: { count: vi.fn() },
    voucher: { count: vi.fn() },
    $queryRawUnsafe: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { runSequenceHealthCheck } from "../sequence-health";
import type { SequenceDocumentType } from "../../types";

const ORG_ID = "org-1";
const SEQ_ID = "seq-1";

function makeSequence(overrides?: { documentType?: string }) {
  return {
    id: SEQ_ID,
    organizationId: ORG_ID,
    documentType: overrides?.documentType ?? "INVOICE",
    formats: [{ formatString: "INV/{YYYY}/{NNNNN}", startCounter: 1, counterPadding: 5 }],
    periods: [{ status: "OPEN", currentCounter: 5 }],
  };
}

describe("runSequenceHealthCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Critical failures ─────────────────────────────────────────────────────

  it("reports critical when no sequence exists", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(null);

    const report = await runSequenceHealthCheck({
      orgId: ORG_ID,
      documentType: "INVOICE" as SequenceDocumentType,
    });

    expect(report.passed).toBe(false);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0].severity).toBe("critical");
    expect(report.failures[0].check).toBe("sequence_exists");
  });

  it("reports critical when finalized docs have no official number", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.count.mockResolvedValue(3);
    mockDb.voucher.count.mockResolvedValue(0);
    mockDb.$queryRawUnsafe.mockResolvedValue([]);

    const report = await runSequenceHealthCheck({
      orgId: ORG_ID,
      documentType: "INVOICE" as SequenceDocumentType,
    });

    expect(report.passed).toBe(false);
    const missingCheck = report.failures.find((f) => f.check === "missing_official_number");
    expect(missingCheck).toBeDefined();
    expect(missingCheck?.severity).toBe("critical");
    expect(missingCheck?.count).toBe(3);
  });

  it("reports critical when duplicate official numbers exist", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.count.mockResolvedValue(0);
    mockDb.$queryRawUnsafe.mockResolvedValue([{ number: "INV/2026/00001", cnt: 2 }]);

    const report = await runSequenceHealthCheck({
      orgId: ORG_ID,
      documentType: "INVOICE" as SequenceDocumentType,
    });

    const dupCheck = report.failures.find((f) => f.check === "duplicate_official_number");
    expect(dupCheck).toBeDefined();
    expect(dupCheck?.severity).toBe("critical");
  });

  it("reports critical when duplicate sequence numbers exist", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.count.mockResolvedValue(0);
    mockDb.$queryRawUnsafe
      .mockResolvedValueOnce([]) // duplicates official number
      .mockResolvedValueOnce([{ seq: SEQ_ID, num: 5, cnt: 2 }]); // duplicate seq num

    const report = await runSequenceHealthCheck({
      orgId: ORG_ID,
      documentType: "INVOICE" as SequenceDocumentType,
    });

    const dupSeqCheck = report.failures.find((f) => f.check === "duplicate_sequence_number");
    expect(dupSeqCheck).toBeDefined();
    expect(dupSeqCheck?.severity).toBe("critical");
  });

  it("reports critical when default format is missing", async () => {
    mockDb.sequence.findFirst.mockResolvedValue({
      ...makeSequence(),
      formats: [],
    });
    mockDb.invoice.count.mockResolvedValue(0);
    mockDb.$queryRawUnsafe.mockResolvedValue([]);

    const report = await runSequenceHealthCheck({
      orgId: ORG_ID,
      documentType: "INVOICE" as SequenceDocumentType,
    });

    const formatCheck = report.failures.find((f) => f.check === "default_format");
    expect(formatCheck).toBeDefined();
    expect(formatCheck?.severity).toBe("critical");
  });

  // ─── Warnings ───────────────────────────────────────────────────────────────

  it("reports warning when docs have no sequence linkage", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.count
      .mockResolvedValueOnce(0) // missing official number
      .mockResolvedValueOnce(5); // missing linkage
    mockDb.$queryRawUnsafe.mockResolvedValue([]);

    const report = await runSequenceHealthCheck({
      orgId: ORG_ID,
      documentType: "INVOICE" as SequenceDocumentType,
    });

    const linkageCheck = report.failures.find((f) => f.check === "missing_sequence_linkage");
    expect(linkageCheck).toBeDefined();
    expect(linkageCheck?.severity).toBe("warning");
    expect(linkageCheck?.count).toBe(5);
  });

  it("reports warning when no periods exist", async () => {
    mockDb.sequence.findFirst.mockResolvedValue({
      ...makeSequence(),
      periods: [],
    });
    mockDb.invoice.count.mockResolvedValue(0);
    mockDb.$queryRawUnsafe.mockResolvedValue([]);

    const report = await runSequenceHealthCheck({
      orgId: ORG_ID,
      documentType: "INVOICE" as SequenceDocumentType,
    });

    const periodCheck = report.failures.find((f) => f.check === "no_periods");
    expect(periodCheck).toBeDefined();
    expect(periodCheck?.severity).toBe("warning");
  });

  // ─── Healthy state ──────────────────────────────────────────────────────────

  it("passes when all checks are clean", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.invoice.count.mockResolvedValue(0);
    mockDb.$queryRawUnsafe.mockResolvedValue([]);

    const report = await runSequenceHealthCheck({
      orgId: ORG_ID,
      documentType: "INVOICE" as SequenceDocumentType,
    });

    expect(report.passed).toBe(true);
    expect(report.failures).toHaveLength(0);
  });

  // ─── Voucher support ────────────────────────────────────────────────────────

  it("works correctly for voucher document type", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence({ documentType: "VOUCHER" }));
    mockDb.voucher.count.mockResolvedValue(0);
    mockDb.$queryRawUnsafe.mockResolvedValue([]);

    const report = await runSequenceHealthCheck({
      orgId: ORG_ID,
      documentType: "VOUCHER" as SequenceDocumentType,
    });

    expect(report.passed).toBe(true);
    expect(report.timestamp).toBeTruthy();
  });
});
