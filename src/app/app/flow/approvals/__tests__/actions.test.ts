import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  approvalRequestCreate: vi.fn(),
  approvalRequestFindMany: vi.fn(),
  approvalRequestCount: vi.fn(),
  approvalRequestFindFirst: vi.fn(),
  approvalRequestUpdate: vi.fn(),
  profileFindUnique: vi.fn(),
  vendorBillFindFirst: vi.fn(),
  vendorBillFindUnique: vi.fn(),
  vendorBillUpdate: vi.fn(),
  paymentRunFindFirst: vi.fn(),
  paymentRunFindUnique: vi.fn(),
  paymentRunUpdate: vi.fn(),
  salarySlipFindFirst: vi.fn(),
  salarySlipFindMany: vi.fn(),
  salarySlipFindUnique: vi.fn(),
  salarySlipUpdate: vi.fn(),
  voucherUpdate: vi.fn(),
  invoiceFindMany: vi.fn(),
  voucherFindMany: vi.fn(),
  txApprovalRequestUpdate: vi.fn(),
  txVendorBillUpdate: vi.fn(),
  txPaymentRunUpdate: vi.fn(),
  txSalarySlipUpdate: vi.fn(),
  txVoucherUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    approvalRequest: {
      create: mocks.approvalRequestCreate,
      findMany: mocks.approvalRequestFindMany,
      count: mocks.approvalRequestCount,
      findFirst: mocks.approvalRequestFindFirst,
      update: mocks.approvalRequestUpdate,
    },
    profile: {
      findUnique: mocks.profileFindUnique,
    },
    vendorBill: {
      findFirst: mocks.vendorBillFindFirst,
      findUnique: mocks.vendorBillFindUnique,
      update: mocks.vendorBillUpdate,
      findMany: vi.fn(),
    },
    paymentRun: {
      findFirst: mocks.paymentRunFindFirst,
      findUnique: mocks.paymentRunFindUnique,
      update: mocks.paymentRunUpdate,
      findMany: vi.fn(),
    },
    salarySlip: {
      findFirst: mocks.salarySlipFindFirst,
      findMany: mocks.salarySlipFindMany,
      findUnique: mocks.salarySlipFindUnique,
      update: mocks.salarySlipUpdate,
    },
    voucher: {
      update: mocks.voucherUpdate,
      findMany: mocks.voucherFindMany,
    },
    invoice: {
      findMany: mocks.invoiceFindMany,
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        approvalRequest: { update: mocks.txApprovalRequestUpdate },
        vendorBill: { update: mocks.txVendorBillUpdate },
        paymentRun: { update: mocks.txPaymentRunUpdate },
        salarySlip: { update: mocks.txSalarySlipUpdate },
        voucher: { update: mocks.txVoucherUpdate },
      }),
    ),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
  notifyOrgAdmins: vi.fn(),
}));

vi.mock("@/lib/accounting", () => ({
  postVendorBillTx: vi.fn(),
  postVoucherTx: vi.fn(),
}));

import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification, notifyOrgAdmins } from "@/lib/notifications";
import {
  approveRequest,
  getApprovalDetail,
  listApprovals,
  rejectRequest,
  requestApproval,
} from "../actions";

describe("Flow approval authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "finance_manager",
    });
    mocks.profileFindUnique.mockResolvedValue({ name: "Approver" });
    mocks.vendorBillFindFirst.mockResolvedValue({ id: "bill-1", status: "DRAFT" });
    mocks.vendorBillFindUnique.mockResolvedValue({ billNumber: "BILL-001" });
    mocks.paymentRunFindFirst.mockResolvedValue({ id: "run-1", status: "PENDING" });
    mocks.paymentRunFindUnique.mockResolvedValue({ runNumber: "RUN-001" });
    mocks.salarySlipFindFirst.mockResolvedValue({ id: "slip-1" });
    mocks.salarySlipFindMany.mockResolvedValue([]);
    mocks.salarySlipFindUnique.mockResolvedValue({ slipNumber: "SLIP-001" });
    mocks.invoiceFindMany.mockResolvedValue([]);
    mocks.voucherFindMany.mockResolvedValue([]);
    mocks.approvalRequestCreate.mockResolvedValue({ id: "approval-1" });
    mocks.approvalRequestFindMany.mockResolvedValue([]);
    mocks.approvalRequestCount.mockResolvedValue(0);
    mocks.approvalRequestUpdate.mockResolvedValue({});
    mocks.txApprovalRequestUpdate.mockResolvedValue({});
    mocks.txVendorBillUpdate.mockResolvedValue({});
    mocks.txPaymentRunUpdate.mockResolvedValue({});
    mocks.txSalarySlipUpdate.mockResolvedValue({});
    mocks.txVoucherUpdate.mockResolvedValue({});
  });

  it("allows finance managers to request vendor bill approvals", async () => {
    const result = await requestApproval("vendor-bill", "bill-1");

    expect(result).toEqual({
      success: true,
      data: { id: "approval-1" },
    });
    expect(mocks.approvalRequestCreate).toHaveBeenCalledWith({
      data: {
        docType: "vendor-bill",
        docId: "bill-1",
        orgId: "org-1",
        requestedById: "user-1",
        requestedByName: "Approver",
        status: "PENDING",
      },
    });
    expect(notifyOrgAdmins).toHaveBeenCalled();
  });

  it("blocks non-finance roles from requesting vendor bill approvals", async () => {
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "user-2",
      role: "hr_manager",
    });

    const result = await requestApproval("vendor-bill", "bill-1");

    expect(result).toEqual({
      success: false,
      error: "Insufficient permissions.",
    });
    expect(mocks.approvalRequestCreate).not.toHaveBeenCalled();
  });

  it("filters finance approvals out of non-finance approval queues", async () => {
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "hr-1",
      role: "hr_manager",
    });

    const result = await listApprovals();

    expect(result).toEqual({
      success: true,
      data: {
        approvals: [],
        total: 0,
        counts: {
          all: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
        },
      },
    });
    expect(mocks.approvalRequestFindMany).toHaveBeenCalledWith({
      where: {
        orgId: "org-1",
        OR: [
          { docType: { notIn: ["vendor-bill", "payment-run"] } },
          { requestedById: "hr-1" },
        ],
      },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
  });

  it("denies vendor bill approval decisions to non-finance roles", async () => {
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "hr-1",
      role: "hr_manager",
    });
    mocks.approvalRequestFindFirst.mockResolvedValue({
      id: "approval-1",
      docType: "vendor-bill",
      docId: "bill-1",
      orgId: "org-1",
      requestedById: "requester-1",
      status: "PENDING",
    });

    const result = await approveRequest("approval-1");

    expect(result).toEqual({
      success: false,
      error: "Insufficient permissions.",
    });
    expect(mocks.txApprovalRequestUpdate).not.toHaveBeenCalled();
  });

  it("keeps salary slip approval decisions working for existing approvers", async () => {
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "hr-1",
      role: "hr_manager",
    });
    mocks.approvalRequestFindFirst.mockResolvedValue({
      id: "approval-2",
      docType: "salary-slip",
      docId: "slip-1",
      orgId: "org-1",
      requestedById: "requester-1",
      status: "PENDING",
    });

    const result = await approveRequest("approval-2", "Looks good");

    expect(result).toEqual({
      success: true,
      data: undefined,
    });
    expect(mocks.txApprovalRequestUpdate).toHaveBeenCalledWith({
      where: { id: "approval-2" },
      data: expect.objectContaining({
        status: "APPROVED",
        approverId: "hr-1",
        approverName: "Approver",
        note: "Looks good",
      }),
    });
    expect(mocks.txSalarySlipUpdate).toHaveBeenCalledWith({
      where: { id: "slip-1" },
      data: { status: "approved" },
    });
    expect(createNotification).toHaveBeenCalled();
  });

  it("returns rejected vendor bills to draft", async () => {
    mocks.approvalRequestFindFirst.mockResolvedValue({
      id: "approval-3",
      docType: "vendor-bill",
      docId: "bill-1",
      orgId: "org-1",
      requestedById: "requester-1",
      status: "PENDING",
    });

    const result = await rejectRequest("approval-3", "Need updated bill lines");

    expect(result).toEqual({
      success: true,
      data: undefined,
    });
    expect(mocks.txApprovalRequestUpdate).toHaveBeenCalledWith({
      where: { id: "approval-3" },
      data: expect.objectContaining({
        status: "REJECTED",
        approverId: "user-1",
        approverName: "Approver",
        note: "Need updated bill lines",
      }),
    });
    expect(mocks.txVendorBillUpdate).toHaveBeenCalledWith({
      where: { id: "bill-1" },
      data: { status: "DRAFT" },
    });
  });

  it("returns rejected payment runs to draft", async () => {
    mocks.approvalRequestFindFirst.mockResolvedValue({
      id: "approval-4",
      docType: "payment-run",
      docId: "run-1",
      orgId: "org-1",
      requestedById: "requester-1",
      status: "PENDING",
    });

    const result = await rejectRequest("approval-4", "Rework the batch totals");

    expect(result).toEqual({
      success: true,
      data: undefined,
    });
    expect(mocks.txPaymentRunUpdate).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: { status: "DRAFT" },
    });
  });

  it("blocks finance approval detail access for non-finance roles", async () => {
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: "org-1",
      userId: "hr-1",
      role: "hr_manager",
    });
    mocks.approvalRequestFindFirst.mockResolvedValue({
      id: "approval-5",
      docType: "vendor-bill",
      docId: "bill-1",
      orgId: "org-1",
      requestedById: "requester-1",
      requestedByName: "Requester",
      approverId: null,
      approverName: null,
      status: "PENDING",
      note: null,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      decidedAt: null,
    });

    const result = await getApprovalDetail("approval-5");

    expect(result).toEqual({
      success: false,
      error: "Insufficient permissions.",
    });
  });
});
