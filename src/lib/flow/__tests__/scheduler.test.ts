import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  scheduledActionFindMany: vi.fn(),
  scheduledActionUpdateMany: vi.fn(),
  scheduledActionFindUnique: vi.fn(),
  scheduledActionUpdate: vi.fn(),
  invoiceFindFirst: vi.fn(),
  approvalRequestFindUnique: vi.fn(),
  approvalRequestUpdate: vi.fn(),
  invoiceTicketFindUnique: vi.fn(),
  deadLetterActionCreate: vi.fn(),
  transaction: vi.fn(),
  sendEmail: vi.fn(),
  notifyOrgAdmins: vi.fn(),
  processApprovalEscalations: vi.fn(),
  fireWorkflowTrigger: vi.fn(),
  resumeWorkflowRun: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    scheduledAction: {
      findMany: mocks.scheduledActionFindMany,
      updateMany: mocks.scheduledActionUpdateMany,
      findUnique: mocks.scheduledActionFindUnique,
      update: mocks.scheduledActionUpdate,
    },
    invoice: {
      findFirst: mocks.invoiceFindFirst,
    },
    approvalRequest: {
      findUnique: mocks.approvalRequestFindUnique,
      update: mocks.approvalRequestUpdate,
    },
    invoiceTicket: {
      findUnique: mocks.invoiceTicketFindUnique,
    },
    deadLetterAction: {
      create: mocks.deadLetterActionCreate,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("@/lib/notifications", () => ({
  notifyOrgAdmins: mocks.notifyOrgAdmins,
}));

vi.mock("@/lib/flow/approvals", () => ({
  processApprovalEscalations: mocks.processApprovalEscalations,
}));

vi.mock("@/lib/flow/workflow-engine", () => ({
  fireWorkflowTrigger: mocks.fireWorkflowTrigger,
  resumeWorkflowRun: mocks.resumeWorkflowRun,
}));

import { processScheduledActions } from "@/lib/flow/scheduler";

describe("processScheduledActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scheduledActionUpdate.mockResolvedValue({});
    mocks.sendEmail.mockResolvedValue(undefined);
  });

  it("claims ready actions safely and scopes invoice email lookups to the org", async () => {
    const action = {
      id: "action-1",
      orgId: "org-1",
      actionType: "send_invoice_email",
      sourceModule: "invoices",
      sourceEntityType: "Invoice",
      sourceEntityId: "inv-1",
      workflowRunId: null,
      payload: {
        invoiceId: "inv-1",
        recipientEmail: "customer@example.com",
      },
      status: "PENDING",
      scheduledAt: new Date("2026-04-20T00:00:00.000Z"),
      attemptCount: 0,
      maxAttempts: 3,
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date("2026-04-20T00:00:00.000Z"),
      completedAt: null,
    };

    mocks.scheduledActionFindMany.mockResolvedValue([action]);
    mocks.scheduledActionUpdateMany.mockResolvedValue({ count: 1 });
    mocks.scheduledActionFindUnique.mockResolvedValue(action);
    mocks.invoiceFindFirst.mockResolvedValue({ id: "inv-1", invoiceNumber: "INV-001" });

    const result = await processScheduledActions();

    expect(result).toEqual({ processed: 1, totalReady: 1 });
    expect(mocks.scheduledActionUpdateMany).toHaveBeenCalled();
    expect(mocks.invoiceFindFirst).toHaveBeenCalledWith({
      where: { id: "inv-1", organizationId: "org-1" },
      select: { invoiceNumber: true, id: true },
    });
    expect(mocks.sendEmail).toHaveBeenCalled();
    expect(mocks.scheduledActionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "action-1" },
        data: expect.objectContaining({ status: "SUCCEEDED" }),
      }),
    );
  });
});
