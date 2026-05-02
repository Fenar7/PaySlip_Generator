import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockDb, mockTx } = vi.hoisted(() => ({
  mockDb: {
    sequence: { findFirst: vi.fn() },
    sequencePeriod: { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), update: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
  mockTx: {
    sequence: { findFirst: vi.fn() },
    sequencePeriod: { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), update: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

import {
  consumeSequenceNumber,
  previewSequenceNumber,
} from "../sequence-engine";
import { SequenceNotFoundError, SequenceEngineError } from "../sequence-engine-errors";

let testSuffix = 0;

const ORG_ID = "org-test";
const SEQ_ID = "seq-test";

function makeSequence() {
  return {
    id: SEQ_ID,
    organizationId: ORG_ID,
    documentType: "INVOICE",
    periodicity: "YEARLY",
    isActive: true,
    formats: [{ formatString: "INV/{YYYY}/{NNNNN}", startCounter: 1, counterPadding: 5 }],
  };
}

function makeSeqWithPeriods(currentCounter: number) {
  return {
    ...makeSequence(),
    periods: [{ id: "period-1", currentCounter }],
  };
}

function makePeriod(overrides?: Record<string, unknown>) {
  return {
    id: "period-1",
    sequenceId: SEQ_ID,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
    currentCounter: 0,
    status: "OPEN",
    ...overrides,
  };
}

const documentDate = new Date("2026-06-15");

function uniqueIdempotencyKey(prefix: string): string {
  return `${prefix}-${++testSuffix}`;
}

describe("sequence-engine concurrency hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.sequence.findFirst.mockResolvedValue(makeSequence());
    mockDb.sequencePeriod.update.mockResolvedValue({ currentCounter: 1 } as never);
  });

  // ─── Period contention ──────────────────────────────────────────────────────

  it("findOrCreatePeriod retries on P2002 unique constraint violation", async () => {
    mockDb.sequencePeriod.findFirst.mockResolvedValue(null);

    const period = makePeriod({ currentCounter: 0 });
    const existingPeriod = makePeriod({ currentCounter: 1 });

    mockDb.sequencePeriod.create
      .mockRejectedValueOnce({ code: "P2002" })
      .mockResolvedValue(period as never);

    mockDb.sequencePeriod.findFirstOrThrow.mockResolvedValue(existingPeriod);

    const result = await consumeSequenceNumber({
      sequenceId: SEQ_ID,
      documentDate,
      orgId: ORG_ID,
    });

    expect(result?.sequenceNumber).toBe(1);
    expect(mockDb.sequencePeriod.create).toHaveBeenCalledTimes(1);
    expect(mockDb.sequencePeriod.findFirstOrThrow).toHaveBeenCalledTimes(1);
  });

  it("findOrCreatePeriod returns existing period when found", async () => {
    const existingPeriod = makePeriod({ currentCounter: 5 });
    mockDb.sequencePeriod.findFirst.mockResolvedValue(existingPeriod);

    mockDb.sequencePeriod.update.mockResolvedValue({ currentCounter: 6 } as never);

    const result = await consumeSequenceNumber({
      sequenceId: SEQ_ID,
      documentDate,
      orgId: ORG_ID,
    });

    expect(result?.sequenceNumber).toBe(6);
    expect(mockDb.sequencePeriod.create).not.toHaveBeenCalled();
    expect(mockDb.sequencePeriod.update).toHaveBeenCalledWith({
      where: { id: "period-1" },
      data: { currentCounter: { increment: 1 } },
      select: { currentCounter: true },
    });
  });

  it("findOrCreatePeriod propagates non-P2002 errors", async () => {
    mockDb.sequencePeriod.findFirst.mockResolvedValue(null);
    const fatalError = new Error("Connection lost");
    mockDb.sequencePeriod.create.mockRejectedValue(fatalError);

    await expect(
      consumeSequenceNumber({ sequenceId: SEQ_ID, documentDate, orgId: ORG_ID })
    ).rejects.toThrow("Connection lost");
  });

  // ─── Idempotency ────────────────────────────────────────────────────────────

  it("returns cached result when idempotency key is reused", async () => {
    const key = uniqueIdempotencyKey("invoice");
    const period = makePeriod({ currentCounter: 0 });
    mockDb.sequencePeriod.findFirst.mockResolvedValue(null);
    mockDb.sequencePeriod.create.mockResolvedValue(period);
    mockDb.sequencePeriod.update.mockResolvedValue({ currentCounter: 1 } as never);

    const first = await consumeSequenceNumber({
      sequenceId: SEQ_ID,
      documentDate,
      orgId: ORG_ID,
      idempotencyKey: key,
    });

    const second = await consumeSequenceNumber({
      sequenceId: SEQ_ID,
      documentDate,
      orgId: ORG_ID,
      idempotencyKey: key,
    });

    expect(second).toEqual(first);
    expect(mockDb.sequencePeriod.findFirst).toHaveBeenCalledTimes(1);
    expect(mockDb.sequencePeriod.create).toHaveBeenCalledTimes(1);
  });

  it("consumes new number when idempotency keys differ", async () => {
    const key1 = uniqueIdempotencyKey("invoice");
    const key2 = uniqueIdempotencyKey("invoice");
    mockDb.sequencePeriod.findFirst.mockResolvedValue(makePeriod({ currentCounter: 3 }));
    mockDb.sequencePeriod.update
      .mockResolvedValueOnce({ currentCounter: 4 } as never)
      .mockResolvedValueOnce({ currentCounter: 5 } as never);

    const first = await consumeSequenceNumber({
      sequenceId: SEQ_ID,
      documentDate,
      orgId: ORG_ID,
      idempotencyKey: key1,
    });

    const second = await consumeSequenceNumber({
      sequenceId: SEQ_ID,
      documentDate,
      orgId: ORG_ID,
      idempotencyKey: key2,
    });

    expect(first.sequenceNumber).toBe(4);
    expect(second.sequenceNumber).toBe(5);
    expect(mockDb.sequencePeriod.update).toHaveBeenCalledTimes(2);
  });

  // ─── Transaction support ────────────────────────────────────────────────────

  it("uses transaction client when tx is provided", async () => {
    const txPeriod = makePeriod({ currentCounter: 0 });
    mockTx.sequence.findFirst.mockResolvedValue(makeSequence());
    mockTx.sequencePeriod.findFirst.mockResolvedValue(null);
    mockTx.sequencePeriod.create.mockResolvedValue(txPeriod);
    mockTx.sequencePeriod.update.mockResolvedValue({ currentCounter: 1 } as never);

    const result = await consumeSequenceNumber({
      sequenceId: SEQ_ID,
      documentDate,
      orgId: ORG_ID,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx: mockTx as any,
    });

    expect(mockTx.sequence.findFirst).toHaveBeenCalledTimes(1);
    expect(mockDb.sequence.findFirst).not.toHaveBeenCalled();
    expect(result?.formattedNumber).toBeTruthy();
  });

  // ─── Preview (read-only, no hardening needed but verify unchanged) ──────────

  it("preview returns next number without consuming counter", async () => {
    mockDb.sequence.findFirst.mockResolvedValue(makeSeqWithPeriods(4));

    const result = await previewSequenceNumber({
      sequenceId: SEQ_ID,
      documentDate,
      orgId: ORG_ID,
    });

    expect(result.nextCounter).toBe(5);
    expect(result.preview).toContain("INV/2026/00005");
    expect(mockDb.sequencePeriod.update).not.toHaveBeenCalled();
  });
});

