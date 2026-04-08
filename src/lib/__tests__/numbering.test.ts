import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    orgDefaults: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import {
  nextDocumentNumber,
  previewNextNumber,
  resetCounter,
  updatePrefix,
} from "../docs/numbering";

describe("document numbering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(db));
  });

  it("increments invoice numbers using only numbering fields", async () => {
    vi.mocked(db.orgDefaults.findUnique).mockResolvedValue({
      invoicePrefix: "INV",
      invoiceCounter: 12,
      voucherPrefix: "VCH",
      voucherCounter: 1,
      salarySlipPrefix: "SAL",
      salarySlipCounter: 1,
      quotePrefix: "QTE",
      quoteCounter: 1,
    } as any);
    vi.mocked(db.orgDefaults.updateMany).mockResolvedValue({ count: 1 } as any);

    const number = await nextDocumentNumber("org-1", "invoice");

    expect(number).toBe("INV-012");
    expect(vi.mocked(db.orgDefaults.findUnique)).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      select: {
        invoicePrefix: true,
        invoiceCounter: true,
      },
    });
    expect(vi.mocked(db.orgDefaults.updateMany)).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      data: { invoiceCounter: 13 },
    });
  });

  it("creates minimal defaults when org defaults do not exist", async () => {
    vi.mocked(db.orgDefaults.findUnique).mockResolvedValue(null);
    vi.mocked(db.orgDefaults.create).mockResolvedValue({
      invoicePrefix: "INV",
      invoiceCounter: 1,
      voucherPrefix: "VCH",
      voucherCounter: 1,
      salarySlipPrefix: "SAL",
      salarySlipCounter: 1,
      quotePrefix: "QTE",
      quoteCounter: 1,
    } as any);
    vi.mocked(db.orgDefaults.updateMany).mockResolvedValue({ count: 1 } as any);

    const number = await nextDocumentNumber("org-1", "invoice");

    expect(number).toBe("INV-001");
    expect(vi.mocked(db.orgDefaults.create)).toHaveBeenCalledWith({
      data: { organizationId: "org-1" },
      select: {
        invoicePrefix: true,
        invoiceCounter: true,
      },
    });
  });

  it("returns a default preview when org defaults are missing", async () => {
    vi.mocked(db.orgDefaults.findUnique).mockResolvedValue(null);

    await expect(previewNextNumber("org-1", "quote")).resolves.toBe("QTE-001");
  });

  it("updates the prefix without requiring a full org defaults row", async () => {
    vi.mocked(db.orgDefaults.updateMany).mockResolvedValue({ count: 1 } as any);

    await updatePrefix("org-1", "invoice", "custom-prefix!");

    expect(vi.mocked(db.orgDefaults.updateMany)).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      data: { invoicePrefix: "CUSTOMPREF" },
    });
  });

  it("creates org defaults when resetting a counter for a new org", async () => {
    vi.mocked(db.orgDefaults.updateMany).mockResolvedValue({ count: 0 } as any);
    vi.mocked(db.orgDefaults.create).mockResolvedValue({ organizationId: "org-1" } as any);

    await resetCounter("org-1", "voucher", 3);

    expect(vi.mocked(db.orgDefaults.create)).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        voucherCounter: 3,
      },
      select: { organizationId: true },
    });
  });
});
