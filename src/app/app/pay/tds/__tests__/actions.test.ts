import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    tdsRecord: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import {
  createTdsRecord,
  updateTdsCert,
  markTdsFiled,
  deleteTdsRecord,
  getTdsRecords,
  exportTdsCsv,
  getCurrentFY,
  getCurrentQuarter,
} from "../actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORG_ID = "org-1";
const USER_ID = "user-1";

function mockAdmin() {
  vi.mocked(requireRole).mockResolvedValue({
    orgId: ORG_ID,
    userId: USER_ID,
    role: "admin",
  });
}

function mockOrgContext() {
  vi.mocked(requireOrgContext).mockResolvedValue({
    orgId: ORG_ID,
    userId: USER_ID,
    role: "admin",
  });
}

function mockFeatureEnabled() {
  vi.mocked(checkFeature).mockResolvedValue(true);
}

function mockFeatureDisabled() {
  vi.mocked(checkFeature).mockResolvedValue(false);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TDS actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ── TC-15-011: TDS amount calculation ───────────────────────────────────

  describe("TC-15-011: TDS amount = invoice total × tdsRate", () => {
    it("calculates TDS amount as totalAmount * (tdsRate / 100)", async () => {
      mockAdmin();
      mockFeatureEnabled();

      vi.mocked(db.invoice.findUnique).mockResolvedValue({
        id: "inv-1",
        organizationId: ORG_ID,
        totalAmount: 50000,
      } as any);

      vi.mocked(db.tdsRecord.create).mockResolvedValue({
        id: "tds-1",
      } as any);

      const result = await createTdsRecord({
        invoiceId: "inv-1",
        tdsSection: "SECTION_194C",
        tdsRate: 2,
      });

      expect(result.success).toBe(true);
      expect(db.tdsRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tdsAmount: 1000, // 50000 * (2/100)
          tdsRate: 2,
          invoiceId: "inv-1",
          tdsSection: "SECTION_194C",
        }),
      });
    });

    it("handles fractional rates correctly", async () => {
      mockAdmin();
      mockFeatureEnabled();

      vi.mocked(db.invoice.findUnique).mockResolvedValue({
        id: "inv-2",
        organizationId: ORG_ID,
        totalAmount: 1000000,
      } as any);

      vi.mocked(db.tdsRecord.create).mockResolvedValue({
        id: "tds-2",
      } as any);

      const result = await createTdsRecord({
        invoiceId: "inv-2",
        tdsSection: "SECTION_194Q",
        tdsRate: 0.1,
      });

      expect(result.success).toBe(true);
      expect(db.tdsRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tdsAmount: 1000, // 1000000 * (0.1/100)
        }),
      });
    });
  });

  // ── TC-15-012: Status transitions ───────────────────────────────────────

  describe("TC-15-012: TDS status transitions PENDING_CERT → CERT_RECEIVED → FILED", () => {
    it("updates status to CERT_RECEIVED when certificate is provided", async () => {
      mockAdmin();

      vi.mocked(db.tdsRecord.findUnique).mockResolvedValue({
        id: "tds-1",
        organizationId: ORG_ID,
        certStatus: "PENDING_CERT",
      } as any);

      vi.mocked(db.tdsRecord.update).mockResolvedValue({
        id: "tds-1",
      } as any);

      const result = await updateTdsCert({
        tdsRecordId: "tds-1",
        certNumber: "TDS/2025/00123",
        certDate: "2025-01-15",
      });

      expect(result.success).toBe(true);
      expect(db.tdsRecord.update).toHaveBeenCalledWith({
        where: { id: "tds-1" },
        data: expect.objectContaining({
          certStatus: "CERT_RECEIVED",
          certNumber: "TDS/2025/00123",
        }),
      });
    });

    it("transitions from CERT_RECEIVED to FILED", async () => {
      mockAdmin();

      vi.mocked(db.tdsRecord.findUnique).mockResolvedValue({
        id: "tds-1",
        organizationId: ORG_ID,
        certStatus: "CERT_RECEIVED",
      } as any);

      vi.mocked(db.tdsRecord.update).mockResolvedValue({
        id: "tds-1",
      } as any);

      const result = await markTdsFiled("tds-1");

      expect(result.success).toBe(true);
      expect(db.tdsRecord.update).toHaveBeenCalledWith({
        where: { id: "tds-1" },
        data: { certStatus: "FILED" },
      });
    });

    it("rejects filing when status is PENDING_CERT", async () => {
      mockAdmin();

      vi.mocked(db.tdsRecord.findUnique).mockResolvedValue({
        id: "tds-1",
        organizationId: ORG_ID,
        certStatus: "PENDING_CERT",
      } as any);

      const result = await markTdsFiled("tds-1");

      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toContain(
        "Only records with received certificates",
      );
    });
  });

  // ── getCurrentFY ────────────────────────────────────────────────────────

  describe("getCurrentFY", () => {
    it("returns correct FY for April–December", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 5, 15)); // June 2025
      expect(getCurrentFY()).toBe("2025-2026");
      vi.useRealTimers();
    });

    it("returns correct FY for January–March", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 1, 10)); // Feb 2026
      expect(getCurrentFY()).toBe("2025-2026");
      vi.useRealTimers();
    });

    it("handles April 1st correctly (start of new FY)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 3, 1)); // April 1, 2025
      expect(getCurrentFY()).toBe("2025-2026");
      vi.useRealTimers();
    });

    it("handles March 31st correctly (end of FY)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 2, 31)); // March 31, 2025
      expect(getCurrentFY()).toBe("2024-2025");
      vi.useRealTimers();
    });
  });

  // ── getCurrentQuarter ───────────────────────────────────────────────────

  describe("getCurrentQuarter", () => {
    it("returns Q1 for April–June", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 4, 1)); // May
      expect(getCurrentQuarter()).toBe("Q1");
      vi.useRealTimers();
    });

    it("returns Q2 for July–September", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 7, 1)); // August
      expect(getCurrentQuarter()).toBe("Q2");
      vi.useRealTimers();
    });

    it("returns Q3 for October–December", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 10, 1)); // November
      expect(getCurrentQuarter()).toBe("Q3");
      vi.useRealTimers();
    });

    it("returns Q4 for January–March", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 1, 1)); // February
      expect(getCurrentQuarter()).toBe("Q4");
      vi.useRealTimers();
    });
  });

  // ── Cannot delete filed TDS record ──────────────────────────────────────

  describe("deleteTdsRecord", () => {
    it("cannot delete a filed TDS record", async () => {
      mockAdmin();

      vi.mocked(db.tdsRecord.findUnique).mockResolvedValue({
        id: "tds-1",
        organizationId: ORG_ID,
        certStatus: "FILED",
      } as any);

      const result = await deleteTdsRecord("tds-1");

      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toContain(
        "Only pending TDS records can be deleted",
      );
      expect(db.tdsRecord.delete).not.toHaveBeenCalled();
    });

    it("cannot delete a record with CERT_RECEIVED status", async () => {
      mockAdmin();

      vi.mocked(db.tdsRecord.findUnique).mockResolvedValue({
        id: "tds-1",
        organizationId: ORG_ID,
        certStatus: "CERT_RECEIVED",
      } as any);

      const result = await deleteTdsRecord("tds-1");

      expect(result.success).toBe(false);
      expect(db.tdsRecord.delete).not.toHaveBeenCalled();
    });

    it("allows deleting a PENDING_CERT record", async () => {
      mockAdmin();

      vi.mocked(db.tdsRecord.findUnique).mockResolvedValue({
        id: "tds-1",
        organizationId: ORG_ID,
        certStatus: "PENDING_CERT",
      } as any);

      vi.mocked(db.tdsRecord.delete).mockResolvedValue({} as any);

      const result = await deleteTdsRecord("tds-1");

      expect(result.success).toBe(true);
      expect(db.tdsRecord.delete).toHaveBeenCalledWith({
        where: { id: "tds-1" },
      });
    });
  });

  // ── Free plan users cannot create TDS records ──────────────────────────

  describe("plan gating", () => {
    it("free plan users cannot create TDS records", async () => {
      mockAdmin();
      mockFeatureDisabled();

      const result = await createTdsRecord({
        invoiceId: "inv-1",
        tdsSection: "SECTION_194C",
        tdsRate: 2,
      });

      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toContain(
        "Starter plan or higher",
      );
      expect(db.tdsRecord.create).not.toHaveBeenCalled();
    });

    it("free plan users cannot list TDS records", async () => {
      mockOrgContext();
      mockFeatureDisabled();

      const result = await getTdsRecords({});

      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toContain(
        "Starter plan or higher",
      );
    });

    it("free plan users cannot export CSV", async () => {
      mockOrgContext();
      mockFeatureDisabled();

      const result = await exportTdsCsv({ financialYear: "2025-2026" });

      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toContain(
        "Starter plan or higher",
      );
    });
  });

  // ── getTdsRecords ──────────────────────────────────────────────────────

  describe("getTdsRecords", () => {
    it("returns records with invoice data", async () => {
      mockOrgContext();
      mockFeatureEnabled();

      vi.mocked(db.tdsRecord.findMany).mockResolvedValue([
        {
          id: "tds-1",
          invoiceId: "inv-1",
          tdsSection: "SECTION_194C",
          tdsRate: 2,
          tdsAmount: 1000,
          certStatus: "PENDING_CERT",
          certNumber: null,
          certDate: null,
          deductorTan: "AAAA12345B",
          financialYear: "2025-2026",
          quarter: "Q1",
          notes: null,
          createdAt: new Date("2025-06-01"),
          invoice: {
            invoiceNumber: "INV-001",
            invoiceDate: "2025-06-01",
            totalAmount: 50000,
          },
        },
      ] as any);

      const result = await getTdsRecords({ financialYear: "2025-2026" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].invoiceNumber).toBe("INV-001");
        expect(result.data[0].tdsAmount).toBe(1000);
      }
    });

    it("filters by quarter and certStatus", async () => {
      mockOrgContext();
      mockFeatureEnabled();

      vi.mocked(db.tdsRecord.findMany).mockResolvedValue([] as any);

      await getTdsRecords({
        financialYear: "2025-2026",
        quarter: "Q1",
        certStatus: "PENDING_CERT",
      });

      expect(db.tdsRecord.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: ORG_ID,
          financialYear: "2025-2026",
          quarter: "Q1",
          certStatus: "PENDING_CERT",
        },
        include: {
          invoice: {
            select: { invoiceNumber: true, invoiceDate: true, totalAmount: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  // ── exportTdsCsv ──────────────────────────────────────────────────────

  describe("exportTdsCsv", () => {
    it("generates correct CSV output", async () => {
      mockOrgContext();
      mockFeatureEnabled();

      vi.mocked(db.tdsRecord.findMany).mockResolvedValue([
        {
          tdsSection: "SECTION_194C",
          tdsRate: 2,
          tdsAmount: 1000,
          certStatus: "PENDING_CERT",
          certNumber: null,
          invoice: {
            invoiceNumber: "INV-001",
            invoiceDate: "2025-06-01",
            totalAmount: 50000,
          },
        },
      ] as any);

      const result = await exportTdsCsv({ financialYear: "2025-2026" });

      expect(result.success).toBe(true);
      if (result.success) {
        const lines = result.data.split("\n");
        expect(lines[0]).toBe(
          "Invoice No,Invoice Date,Amount,TDS Section,TDS Rate (%),TDS Amount,Cert Status,Cert Number",
        );
        expect(lines[1]).toBe(
          "INV-001,2025-06-01,50000.00,SECTION_194C,2.00,1000.00,PENDING_CERT,",
        );
      }
    });
  });

  // ── createTdsRecord validation ─────────────────────────────────────────

  describe("createTdsRecord validation", () => {
    it("rejects invalid TDS section", async () => {
      mockAdmin();
      mockFeatureEnabled();

      vi.mocked(db.invoice.findUnique).mockResolvedValue({
        id: "inv-1",
        organizationId: ORG_ID,
        totalAmount: 50000,
      } as any);

      const result = await createTdsRecord({
        invoiceId: "inv-1",
        tdsSection: "INVALID_SECTION",
        tdsRate: 10,
      });

      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toContain("Invalid TDS section");
    });

    it("rejects invoice from different org", async () => {
      mockAdmin();
      mockFeatureEnabled();

      vi.mocked(db.invoice.findUnique).mockResolvedValue({
        id: "inv-1",
        organizationId: "other-org",
        totalAmount: 50000,
      } as any);

      const result = await createTdsRecord({
        invoiceId: "inv-1",
        tdsSection: "SECTION_194C",
        tdsRate: 2,
      });

      expect(result.success).toBe(false);
      expect(result.success === false && result.error).toContain("Invoice not found");
    });

    it("stores optional deductorTan and notes", async () => {
      mockAdmin();
      mockFeatureEnabled();

      vi.mocked(db.invoice.findUnique).mockResolvedValue({
        id: "inv-1",
        organizationId: ORG_ID,
        totalAmount: 100000,
      } as any);

      vi.mocked(db.tdsRecord.create).mockResolvedValue({
        id: "tds-1",
      } as any);

      await createTdsRecord({
        invoiceId: "inv-1",
        tdsSection: "SECTION_194J",
        tdsRate: 10,
        deductorTan: "AAAA12345B",
        notes: "Professional services fee",
      });

      expect(db.tdsRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deductorTan: "AAAA12345B",
          notes: "Professional services fee",
        }),
      });
    });
  });
});
