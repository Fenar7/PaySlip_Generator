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
  fiscalPeriodFindFirst: vi.fn(),
  fiscalPeriodFindMany: vi.fn(),
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
  approvePaymentRunTx: vi.fn(),
  rejectPaymentRun: vi.fn(),
  reopenFiscalPeriodTx: vi.fn(),
  markCloseRunReopenedTx: vi.fn(),
  getFiscalPeriodReopenImpact: vi.fn(),
  createApprovalRequest: vi.fn(),
  advanceApprovalChain: vi.fn(),
  getApprovalDocumentAmount: vi.fn(),
  getApprovalDecisionContext: vi.fn(),
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
    fiscalPeriod: {
      findFirst: mocks.fiscalPeriodFindFirst,
      findMany: mocks.fiscalPeriodFindMany,
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

vi.mock("@/lib/flow/approvals", () => ({
  createApprovalRequest: mocks.createApprovalRequest,
  advanceApprovalChain: mocks.advanceApprovalChain,
  getApprovalDocumentAmount: mocks.getApprovalDocumentAmount,
  getApprovalDecisionContext: mocks.getApprovalDecisionContext,
}));

vi.mock("@/lib/accounting", () => ({
  postVendorBillTx: vi.fn(),
  postVoucherTx: vi.fn(),
  approvePaymentRunTx: mocks.approvePaymentRunTx,
  getFiscalPeriodReopenImpact: mocks.getFiscalPeriodReopenImpact,
  rejectPaymentRun: mocks.rejectPaymentRun,
  reopenFiscalPeriodTx: mocks.reopenFiscalPeriodTx,
  markCloseRunReopenedTx: mocks.markCloseRunReopenedTx,
}));

import { requireOrgContext } from "@/lib/auth";
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
    mocks.fiscalPeriodFindFirst.mockResolvedValue({ id: "period-1", status: "LOCKED" });
    mocks.fiscalPeriodFindMany.mockResolvedValue([]);
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
    mocks.approvePaymentRunTx.mockResolvedValue(undefined);
    mocks.rejectPaymentRun.mockResolvedValue(undefined);
    mocks.reopenFiscalPeriodTx.mockResolvedValue(undefined);
    mocks.markCloseRunReopenedTx.mockResolvedValue(undefined);
    mocks.getFiscalPeriodReopenImpact.mockResolvedValue({
      journalCount: 0,
      postedJournalCount: 0,
      draftJournalCount: 0,
      affectedAccountCount: 0,
      affectedAccounts: [],
      earliestEntryDate: null,
      latestEntryDate: null,
      closeCompletedAt: null,
      sampleEntries: [],
    });
    mocks.createApprovalRequest.mockResolvedValue({ id: "approval-1" });
    mocks.advanceApprovalChain.mockResolvedValue({ status: "APPROVED" });
    mocks.getApprovalDocumentAmount.mockResolvedValue(2500);
    mocks.getApprovalDecisionContext.mockResolvedValue({ allowed: true });
  });

  it("allows finance managers to request vendor bill approvals", async () => {
    const result = await requestApproval("vendor-bill", "bill-1");

    expect(result).toEqual({
      success: true,
      data: { id: "approval-1" },
    });
    expect(mocks.createApprovalRequest).toHaveBeenCalledWith({
      docType: "vendor-bill",
      docId: "bill-1",
      orgId: "org-1",
      requestedById: "user-1",
      requestedByName: "Approver",
      docNumber: "BILL-001",
      amount: 2500,
    });
    expect(mocks.approvalRequestCreate).not.toHaveBeenCalled();
    expect(notifyOrgAdmins).not.toHaveBeenCalled();
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
            escalated: 0,
          },
        },
      });
    expect(mocks.approvalRequestFindMany).toHaveBeenCalledWith({
      where: {
        orgId: "org-1",
        OR: [
          { docType: { notIn: ["vendor-bill", "payment-run", "fiscal-period-reopen"] } },
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
    expect(mocks.advanceApprovalChain).toHaveBeenCalledWith(
      "approval-2",
      "hr-1",
      "Approver",
      "APPROVED",
      "Looks good",
      undefined,
    );
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
    expect(mocks.advanceApprovalChain).toHaveBeenCalledWith(
      "approval-3",
      "user-1",
      "Approver",
      "REJECTED",
      "Need updated bill lines",
      undefined,
    );
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

  it("marks rejected payment runs as REJECTED through the payment-run service", async () => {
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
    expect(mocks.rejectPaymentRun).toHaveBeenCalledWith({
      orgId: "org-1",
      paymentRunId: "run-1",
      reason: "Rework the batch totals",
      actorId: "user-1",
    });
    expect(mocks.approvalRequestUpdate).toHaveBeenCalledWith({
      where: { id: "approval-4" },
      data: expect.objectContaining({
        status: "REJECTED",
        approverId: "user-1",
        approverName: "Approver",
        note: "Rework the batch totals",
      }),
    });
  });

  it("rejects approval decisions when the user is not assigned to the current rule", async () => {
    mocks.getApprovalDecisionContext.mockResolvedValueOnce({ allowed: false });
    mocks.approvalRequestFindFirst.mockResolvedValue({
      id: "approval-6",
      docType: "salary-slip",
      docId: "slip-1",
      orgId: "org-1",
      requestedById: "requester-1",
      status: "PENDING",
      policyId: "policy-1",
      policyRuleId: "rule-1",
      currentRuleOrder: 1,
    });

    const result = await approveRequest("approval-6");

    expect(result).toEqual({
      success: false,
      error: "You are not assigned to the current approval step.",
    });
    expect(mocks.advanceApprovalChain).not.toHaveBeenCalled();
  });

  it("supports escalated approval filters", async () => {
    await listApprovals({ status: "ESCALATED" });

    expect(mocks.approvalRequestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: "org-1",
          status: "ESCALATED",
        }),
      }),
    );
  });

  it("includes reopen impact context in fiscal period approval detail", async () => {
    mocks.approvalRequestFindFirst.mockResolvedValue({
      id: "approval-5",
      docType: "fiscal-period-reopen",
      docId: "period-1",
      orgId: "org-1",
      requestedById: "requester-1",
      requestedByName: "Requester",
      approverId: null,
      approverName: null,
      status: "PENDING",
      note: "Need to correct the April close pack.",
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      decidedAt: null,
    });
    mocks.fiscalPeriodFindMany.mockResolvedValue([
      {
        id: "period-1",
        label: "FY26-APR",
        endDate: new Date("2026-04-30T00:00:00.000Z"),
      },
    ]);
    mocks.getFiscalPeriodReopenImpact.mockResolvedValue({
      journalCount: 7,
      postedJournalCount: 7,
      draftJournalCount: 0,
      affectedAccountCount: 3,
      affectedAccounts: [{ id: "bank", code: "1110", name: "Primary Bank" }],
      earliestEntryDate: "2026-04-01T00:00:00.000Z",
      latestEntryDate: "2026-04-30T00:00:00.000Z",
      closeCompletedAt: "2026-05-01T10:00:00.000Z",
      sampleEntries: [],
    });

    const result = await getApprovalDetail("approval-5");

    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        id: "approval-5",
        docType: "fiscal-period-reopen",
        note: "Need to correct the April close pack.",
        reopenImpact: expect.objectContaining({
          journalCount: 7,
          affectedAccountCount: 3,
        }),
        document: expect.objectContaining({
          number: "FY26-APR",
        }),
      }),
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
