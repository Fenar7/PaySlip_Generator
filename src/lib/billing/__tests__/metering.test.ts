import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db before importing
vi.mock(import("@/lib/db"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    db: {
      usageRecord: {
        upsert: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      billingAccount: {
        findUnique: vi.fn().mockResolvedValue({ id: "ba_1", orgId: "org_1" }),
      },
      overageLine: {
        upsert: vi.fn(),
      },
    },
  };
});

vi.mock(import("@/lib/plans/enforcement"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getOrgPlan: vi.fn().mockResolvedValue({
      planId: "starter",
      limits: {
        pdfExportsPerMonth: 100,
        pixelJobsSaved: 50,
        storageBytes: 5368709120, // 5GB
        emailSendsPerMonth: 200,
      },
    }),
  };
});

vi.mock(import("@/lib/usage-metering"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getOrComputeSnapshot: vi.fn().mockResolvedValue({
      pixelJobsSaved: 0,
      storageBytes: 0,
    }),
  };
});

import { getCurrentPeriod, getCurrentUsage, checkResourceLimit, calculateOverages } from "../metering";
import { db } from "@/lib/db";
import { getOrComputeSnapshot } from "@/lib/usage-metering";

describe("Metering Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentPeriod", () => {
    it("should return correct period format", () => {
      const { periodMonth, periodStart, periodEnd } = getCurrentPeriod();
      expect(periodMonth).toMatch(/^\d{4}-\d{2}$/);
      expect(periodStart.getDate()).toBe(1);
      expect(periodEnd.getDate()).toBeGreaterThanOrEqual(28);
    });

    it("should have period start before period end", () => {
      const { periodStart, periodEnd } = getCurrentPeriod();
      expect(periodStart.getTime()).toBeLessThan(periodEnd.getTime());
    });
  });

  describe("checkResourceLimit", () => {
    it("should allow usage below limit", async () => {
      vi.mocked(db.usageRecord.findMany).mockResolvedValueOnce([
        {
          id: "1",
          orgId: "org_1",
          resource: "pdf_jobs",
          periodMonth: "2026-06",
          periodDay: null,
          count: 50,
          updatedAt: new Date(),
        },
      ] as never);

      const result = await checkResourceLimit("org_1", "pdf_jobs");
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(50);
      expect(result.limit).toBe(100);
      expect(result.usagePercent).toBe(50);
    });

    it("should allow overage for paid tiers (soft limit)", async () => {
      vi.mocked(db.usageRecord.findMany).mockResolvedValueOnce([
        {
          id: "1",
          orgId: "org_1",
          resource: "pdf_jobs",
          periodMonth: "2026-06",
          periodDay: null,
          count: 150,
          updatedAt: new Date(),
        },
      ] as never);

      const result = await checkResourceLimit("org_1", "pdf_jobs");
      expect(result.allowed).toBe(true); // paid tier: soft limit
      expect(result.current).toBe(150);
      expect(result.usagePercent).toBe(150);
    });

    it("should return unlimited for unmapped resources", async () => {
      const result = await checkResourceLimit("org_1", "unknown_resource");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it("should use snapshot-backed usage for pixel jobs", async () => {
      vi.mocked(getOrComputeSnapshot).mockResolvedValueOnce({
        pixelJobsSaved: 42,
        storageBytes: 0,
      });

      const result = await checkResourceLimit("org_1", "pixel_jobs");
      expect(result.current).toBe(42);
      expect(result.limit).toBe(50);
      expect(result.usagePercent).toBe(84);
    });
  });

  describe("getCurrentUsage", () => {
    it("should overlay snapshot-backed resources onto billing usage", async () => {
      vi.mocked(db.usageRecord.findMany).mockResolvedValueOnce([
        { resource: "pdf_jobs", count: 12 },
      ] as never);
      vi.mocked(getOrComputeSnapshot).mockResolvedValueOnce({
        pixelJobsSaved: 7,
        storageBytes: 1024,
      });

      const usage = await getCurrentUsage("org_1");
      expect(usage.pdf_jobs).toBe(12);
      expect(usage.pixel_jobs).toBe(7);
      expect(usage.storage_gb).toBe(1024);
    });
  });

  describe("calculateOverages", () => {
    it("should return empty array when no overages", async () => {
      vi.mocked(db.usageRecord.findMany).mockResolvedValueOnce([
        { id: "1", orgId: "org_1", resource: "pdf_jobs", periodMonth: "2026-06", periodDay: null, count: 50, updatedAt: new Date() },
      ]);

      const result = await calculateOverages("org_1");
      expect(result).toEqual([]);
    });

    it("should calculate overages for exceeded resources", async () => {
      vi.mocked(db.usageRecord.findMany).mockResolvedValueOnce([
        { id: "1", orgId: "org_1", resource: "pdf_jobs", periodMonth: "2026-06", periodDay: null, count: 150, updatedAt: new Date() },
      ]);

      const result = await calculateOverages("org_1");
      expect(result).toHaveLength(1);
      expect(result[0].resource).toBe("pdf_jobs");
      expect(result[0].overageUnits).toBe(50);
      expect(result[0].includedUnits).toBe(100);
      expect(result[0].usedUnits).toBe(150);
      expect(result[0].overageAmountPaise).toBeGreaterThan(BigInt(0));
    });

    it("should handle multiple resource overages", async () => {
      vi.mocked(db.usageRecord.findMany).mockResolvedValueOnce([
        { id: "1", orgId: "org_1", resource: "pdf_jobs", periodMonth: "2026-06", periodDay: null, count: 200, updatedAt: new Date() },
        { id: "2", orgId: "org_1", resource: "pixel_jobs", periodMonth: "2026-06", periodDay: null, count: 100, updatedAt: new Date() },
      ]);
      vi.mocked(getOrComputeSnapshot).mockResolvedValueOnce({
        pixelJobsSaved: 100,
        storageBytes: 0,
      });

      const result = await calculateOverages("org_1");
      expect(result).toHaveLength(2);
      expect(result.find((o) => o.resource === "pdf_jobs")?.overageUnits).toBe(100);
      expect(result.find((o) => o.resource === "pixel_jobs")?.overageUnits).toBe(50);
    });
  });
});
