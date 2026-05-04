import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    sequence: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    sequenceSnapshot: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import {
  createSnapshot,
  getSequenceSnapshots,
  getSnapshot,
  getCurrentSequenceState,
  listAllOrgSnapshots,
  backfillSnapshotIfNeeded,
} from "../sequence-history";

const ORG_ID = "org-1";
const SEQ_ID = "seq-1";
const USER_ID = "user-1";

describe("sequence-history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSnapshot", () => {
    it("creates a v1 snapshot when no prior versions exist", async () => {
      vi.mocked(db.sequence.findUnique).mockResolvedValue({
        id: SEQ_ID,
        organizationId: ORG_ID,
        name: "Invoice Sequence",
        documentType: "INVOICE",
        periodicity: "YEARLY",
        isActive: true,
        formats: [
          {
            formatString: "INV/{YYYY}/{NNNNN}",
            startCounter: 1,
            counterPadding: 5,
          },
        ],
        periods: [
          {
            id: "per-1",
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-12-31"),
            currentCounter: 10,
            status: "OPEN",
          },
        ],
      } as any);

      vi.mocked(db.sequenceSnapshot.findFirst).mockResolvedValue(null);

      vi.mocked(db.sequenceSnapshot.create).mockResolvedValue({
        id: "snap-1",
        version: 1,
      } as any);

      const result = await createSnapshot({
        sequenceId: SEQ_ID,
        orgId: ORG_ID,
        changedById: USER_ID,
        changeType: "CREATED",
        changeSummary: "Initial snapshot",
      });

      expect(result.version).toBe(1);
      expect(db.sequenceSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sequenceId: SEQ_ID,
            version: 1,
            name: "Invoice Sequence",
            documentType: "INVOICE",
            periodicity: "YEARLY",
            formatString: "INV/{YYYY}/{NNNNN}",
            startCounter: 1,
            counterPadding: 5,
            changeType: "CREATED",
            changeSummary: "Initial snapshot",
            changedById: USER_ID,
          }),
        }),
      );
    });

    it("creates v3 when v2 already exists", async () => {
      vi.mocked(db.sequence.findUnique).mockResolvedValue({
        id: SEQ_ID,
        name: "Invoice Sequence",
        documentType: "INVOICE",
        periodicity: "MONTHLY",
        isActive: true,
        formats: [
          { formatString: "INV-{YYYY}-{MM}-{NNNNN}", startCounter: 1, counterPadding: 5 },
        ],
        periods: [],
      } as any);

      vi.mocked(db.sequenceSnapshot.findFirst).mockResolvedValue({
        version: 2,
      } as any);

      vi.mocked(db.sequenceSnapshot.create).mockResolvedValue({
        id: "snap-3",
        version: 3,
      } as any);

      const result = await createSnapshot({
        sequenceId: SEQ_ID,
        orgId: ORG_ID,
        changedById: USER_ID,
        changeType: "UPDATED",
        changeSummary: "Format changed",
      });

      expect(result.version).toBe(3);
    });
  });

  describe("getSequenceSnapshots", () => {
    it("returns snapshots ordered by newest version first", async () => {
      vi.mocked(db.sequenceSnapshot.findMany).mockResolvedValue([
        {
          id: "snap-2",
          version: 2,
          name: "Invoice Sequence",
          documentType: "INVOICE",
          periodicity: "YEARLY",
          isActive: true,
          formatString: "INV-{YYYY}-{NNNNN}",
          startCounter: 1,
          counterPadding: 5,
          totalConsumed: 42,
          periodsSnapshot: [],
          changeType: "UPDATED",
          changeSummary: "Format changed",
          changeNote: null,
          createdAt: new Date("2026-05-01"),
          changedBy: { id: USER_ID, name: "Admin" },
        },
        {
          id: "snap-1",
          version: 1,
          name: "Invoice Sequence",
          documentType: "INVOICE",
          periodicity: "YEARLY",
          isActive: true,
          formatString: "INV/{YYYY}/{NNNNN}",
          startCounter: 1,
          counterPadding: 5,
          totalConsumed: 10,
          periodsSnapshot: [],
          changeType: "CREATED",
          changeSummary: "Initial snapshot",
          changeNote: null,
          createdAt: new Date("2026-01-10"),
          changedBy: null,
        },
      ] as any);

      const snapshots = await getSequenceSnapshots(ORG_ID, SEQ_ID);

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].version).toBe(2);
      expect(snapshots[1].version).toBe(1);
      expect(snapshots[0].changedBy?.name).toBe("Admin");
    });
  });

  describe("getSnapshot", () => {
    it("returns null when snapshot not found", async () => {
      vi.mocked(db.sequenceSnapshot.findFirst).mockResolvedValue(null);

      const result = await getSnapshot(ORG_ID, "nonexistent");
      expect(result).toBeNull();
    });

    it("returns formatted snapshot entry", async () => {
      vi.mocked(db.sequenceSnapshot.findFirst).mockResolvedValue({
        id: "snap-1",
        version: 1,
        name: "Invoice Sequence",
        documentType: "INVOICE",
        periodicity: "YEARLY",
        isActive: true,
        formatString: "INV/{YYYY}/{NNNNN}",
        startCounter: 1,
        counterPadding: 5,
        totalConsumed: 0,
        periodsSnapshot: [
          {
            periodId: "per-1",
            startDate: "2026-01-01",
            endDate: "2026-12-31",
            currentCounter: 5,
            status: "OPEN",
          },
        ],
        changeType: "CREATED",
        changeSummary: "Initial",
        changeNote: null,
        createdAt: new Date("2026-01-01"),
        changedBy: { id: USER_ID, name: "Admin" },
      } as any);

      const result = await getSnapshot(ORG_ID, "snap-1");

      expect(result).not.toBeNull();
      expect(result!.version).toBe(1);
      expect(result!.periodsSnapshot).toHaveLength(1);
      expect(result!.periodsSnapshot[0].periodId).toBe("per-1");
    });
  });

  describe("getCurrentSequenceState", () => {
    it("returns formatted live state", async () => {
      vi.mocked(db.sequence.findFirst).mockResolvedValue({
        id: SEQ_ID,
        name: "Invoice Sequence",
        periodicity: "YEARLY",
        isActive: true,
        formats: [
          { formatString: "INV/{YYYY}/{NNNNN}", startCounter: 1, counterPadding: 5 },
        ],
        periods: [
          {
            id: "per-1",
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-06-30"),
            currentCounter: 8,
            status: "CLOSED",
          },
          {
            id: "per-2",
            startDate: new Date("2026-07-01"),
            endDate: new Date("2026-12-31"),
            currentCounter: 3,
            status: "OPEN",
          },
        ],
      } as any);

      const result = await getCurrentSequenceState(ORG_ID, SEQ_ID);

      expect(result).not.toBeNull();
      expect(result!.formatString).toBe("INV/{YYYY}/{NNNNN}");
      expect(result!.periods).toHaveLength(2);
      expect(result!.totalConsumed).toBe(11);
    });

    it("returns null when sequence not found", async () => {
      vi.mocked(db.sequence.findFirst).mockResolvedValue(null);

      const result = await getCurrentSequenceState(ORG_ID, "nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("listAllOrgSnapshots", () => {
    it("groups sequences by document type", async () => {
      vi.mocked(db.sequence.findMany).mockResolvedValue([
        {
          id: "seq-1",
          name: "Invoice Main",
          documentType: "INVOICE",
          isActive: true,
          _count: { snapshots: 3 },
        },
        {
          id: "seq-2",
          name: "Voucher Default",
          documentType: "VOUCHER",
          isActive: true,
          _count: { snapshots: 1 },
        },
        {
          id: "seq-3",
          name: "Invoice Legacy",
          documentType: "INVOICE",
          isActive: false,
          _count: { snapshots: 2 },
        },
      ] as any);

      const groups = await listAllOrgSnapshots(ORG_ID);

      expect(groups).toHaveLength(2);
      const invoiceGroup = groups.find((g) => g.documentType === "INVOICE");
      expect(invoiceGroup).toBeDefined();
      expect(invoiceGroup!.sequences).toHaveLength(2);
      const voucherGroup = groups.find((g) => g.documentType === "VOUCHER");
      expect(voucherGroup).toBeDefined();
      expect(voucherGroup!.sequences).toHaveLength(1);
    });
  });

  describe("backfillSnapshotIfNeeded", () => {
    it("creates v1 when no snapshots exist", async () => {
      vi.mocked(db.sequenceSnapshot.findFirst).mockResolvedValue(null);

      vi.mocked(db.sequence.findUnique).mockResolvedValue({
        id: SEQ_ID,
        name: "Test",
        documentType: "INVOICE",
        periodicity: "NONE",
        isActive: true,
        formats: [
          { formatString: "TST-{NNNNN}", startCounter: 1, counterPadding: 5 },
        ],
        periods: [],
      } as any);

      vi.mocked(db.sequenceSnapshot.create).mockResolvedValue({
        id: "snap-1",
        version: 1,
      } as any);

      await backfillSnapshotIfNeeded(ORG_ID, SEQ_ID, USER_ID);

      expect(db.sequenceSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sequenceId: SEQ_ID,
            version: 1,
            changeType: "CREATED",
          }),
        }),
      );
    });

    it("does nothing when snapshots already exist", async () => {
      vi.mocked(db.sequenceSnapshot.findFirst).mockResolvedValue({
        id: "existing-snap",
      } as any);

      await backfillSnapshotIfNeeded(ORG_ID, SEQ_ID, USER_ID);

      expect(db.sequence.findUnique).not.toHaveBeenCalled();
    });

    it("does nothing when sequence does not exist", async () => {
      vi.mocked(db.sequenceSnapshot.findFirst).mockResolvedValue(null);
      vi.mocked(db.sequence.findUnique).mockResolvedValue(null);

      await backfillSnapshotIfNeeded(ORG_ID, "nonexistent", USER_ID);

      expect(db.sequenceSnapshot.create).not.toHaveBeenCalled();
    });
  });
});
