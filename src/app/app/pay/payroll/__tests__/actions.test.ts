import { beforeEach, describe, expect, it, vi } from "vitest";
import { PayrollStatus } from "@/generated/prisma/client";

vi.mock("@/lib/db", () => ({
  db: {
    payrollRun: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    payrollRunItem: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
    salarySlip: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/docs", () => ({
  nextDocumentNumber: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/webhook/deliver", () => ({
  dispatchEvent: vi.fn().mockResolvedValue(undefined),
}));

import { requireOrgContext, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextDocumentNumber } from "@/lib/docs";
import { finalizePayrollRun } from "../actions";

describe("payroll finalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "admin",
    });
    vi.mocked(requireRole).mockResolvedValue(undefined);
    vi.mocked(nextDocumentNumber).mockResolvedValue("SAL-001");
    vi.mocked(db.salarySlip.create).mockResolvedValue({ id: "slip-1" } as any);
    vi.mocked(db.payrollRunItem.update).mockResolvedValue({} as any);
    vi.mocked(db.payrollRunItem.findMany).mockResolvedValue([
      {
        grossPay: 50000,
        totalDeductions: 4500,
        netPay: 45500,
        pfEmployer: 1800,
        esiEmployer: 0,
      },
    ] as any);
    vi.mocked(db.payrollRun.update).mockResolvedValue({} as any);
  });

  it("creates payroll-generated salary slips with normalized salary components", async () => {
    vi.mocked(db.payrollRun.findFirst).mockResolvedValue({
      id: "run-1",
      period: "2026-04",
      status: PayrollStatus.REVIEW,
      runItems: [
        {
          id: "item-1",
          employeeId: "emp-1",
          grossPay: 50000,
          netPay: 45500,
          basicPay: 30000,
          hra: 10000,
          specialAllowance: 10000,
          pfEmployee: 1800,
          esiEmployee: 0,
          tdsDeduction: 2500,
          professionalTax: 200,
          pfEmployer: 1800,
          esiEmployer: 0,
          employee: { name: "Asha", organizationId: "org-1" },
        },
      ],
    } as any);

    const result = await finalizePayrollRun("run-1");

    expect(result).toEqual({
      success: true,
      data: { slipsCreated: 1 },
    });
    expect(db.salarySlip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "final",
          grossPay: 50000,
          netPay: 45500,
          components: {
            create: [
              { label: "Basic Pay", amount: 30000, type: "earning", sortOrder: 0 },
              { label: "HRA", amount: 10000, type: "earning", sortOrder: 1 },
              { label: "Special Allowance", amount: 10000, type: "earning", sortOrder: 2 },
              { label: "Employee PF", amount: 1800, type: "deduction", sortOrder: 3 },
              { label: "TDS", amount: 2500, type: "deduction", sortOrder: 4 },
              { label: "Professional Tax", amount: 200, type: "deduction", sortOrder: 5 },
            ],
          },
        }),
      }),
    );
  });
});
