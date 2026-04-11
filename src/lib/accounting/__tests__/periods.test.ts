import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    fiscalPeriod: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import {
  assertPostingAllowedTx,
  buildFiscalPeriodSeeds,
  lockFiscalPeriod,
  reopenFiscalPeriod,
} from "../periods";

function txProxy() {
  vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(db));
}

describe("buildFiscalPeriodSeeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txProxy();
  });

  it("builds a 36-month window around the current fiscal year", () => {
    const periods = buildFiscalPeriodSeeds(new Date("2026-08-15T00:00:00Z"), 4);

    expect(periods).toHaveLength(36);
    expect(periods[0]).toMatchObject({
      label: "2025-04",
      startDate: new Date("2025-04-01T00:00:00.000Z"),
      endDate: new Date("2025-04-30T23:59:59.999Z"),
    });
    expect(periods.at(-1)).toMatchObject({
      label: "2028-03",
      startDate: new Date("2028-03-01T00:00:00.000Z"),
      endDate: new Date("2028-03-31T23:59:59.999Z"),
    });
  });

  it("shifts the fiscal window when the start month is January", () => {
    const periods = buildFiscalPeriodSeeds(new Date("2026-02-10T00:00:00Z"), 1);

    expect(periods[0]?.label).toBe("2025-01");
    expect(periods[12]?.label).toBe("2026-01");
    expect(periods.at(-1)?.label).toBe("2027-12");
  });

  it("rejects invalid fiscal year start months", () => {
    expect(() => buildFiscalPeriodSeeds(new Date("2026-01-01T00:00:00Z"), 0)).toThrow(
      "between 1 and 12",
    );
    expect(() => buildFiscalPeriodSeeds(new Date("2026-01-01T00:00:00Z"), 13)).toThrow(
      "between 1 and 12",
    );
  });

  it("locks an open fiscal period and writes an audit event", async () => {
    vi.mocked(db.fiscalPeriod.findFirst).mockResolvedValue({
      id: "period-1",
      orgId: "org-1",
      label: "2026-04",
      status: "OPEN",
    } as any);
    vi.mocked(db.fiscalPeriod.update).mockResolvedValue({
      id: "period-1",
      status: "LOCKED",
    } as any);
    vi.mocked(db.auditLog.create).mockResolvedValue({} as any);

    const result = await lockFiscalPeriod({
      orgId: "org-1",
      periodId: "period-1",
      actorId: "user-1",
    });

    expect(result.status).toBe("LOCKED");
    expect(db.fiscalPeriod.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "period-1" },
        data: expect.objectContaining({
          status: "LOCKED",
          lockedBy: "user-1",
        }),
      }),
    );
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "books.period.locked",
          entityId: "period-1",
        }),
      }),
    );
  });

  it("reopens a locked fiscal period with a reason", async () => {
    vi.mocked(db.fiscalPeriod.findFirst).mockResolvedValue({
      id: "period-1",
      orgId: "org-1",
      label: "2026-04",
      status: "LOCKED",
    } as any);
    vi.mocked(db.fiscalPeriod.update).mockResolvedValue({
      id: "period-1",
      status: "OPEN",
      reopenReason: "Adjusting opening balances",
    } as any);
    vi.mocked(db.auditLog.create).mockResolvedValue({} as any);

    const result = await reopenFiscalPeriod({
      orgId: "org-1",
      periodId: "period-1",
      actorId: "user-1",
      reason: "Adjusting opening balances",
    });

    expect(result.status).toBe("OPEN");
    expect(db.fiscalPeriod.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "period-1" },
        data: expect.objectContaining({
          status: "OPEN",
          reopenedBy: "user-1",
          reopenReason: "Adjusting opening balances",
        }),
      }),
    );
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "books.period.reopened",
          entityId: "period-1",
        }),
      }),
    );
  });

  it("audits blocked posting attempts into locked periods", async () => {
    vi.mocked(db.fiscalPeriod.findFirst).mockResolvedValue({
      id: "period-1",
      orgId: "org-1",
      label: "2026-04",
      status: "LOCKED",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-04-30T23:59:59.999Z"),
    } as any);
    vi.mocked(db.auditLog.create).mockResolvedValue({} as any);

    await expect(
      assertPostingAllowedTx(db as any, "org-1", "2026-04-15", {
        actorId: "user-1",
        source: "INVOICE",
        sourceId: "invoice-1",
      }),
    ).rejects.toThrow("Posting is locked for fiscal period 2026-04.");

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: "org-1",
        actorId: "user-1",
        action: "books.posting.blocked",
        entityId: "period-1",
        metadata: {
          label: "2026-04",
          status: "LOCKED",
          entryDate: "2026-04-15",
          source: "INVOICE",
          sourceId: "invoice-1",
        },
      }),
    });
  });
});
