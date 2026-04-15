import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, mockTx, mockLogAudit, mockGenerateGstr1 } = vi.hoisted(() => {
  const tx = {
    gstFilingRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
    gstFilingValidationIssue: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    gstFilingSubmission: {
      create: vi.fn(),
      update: vi.fn(),
    },
    gstFilingReconciliation: {
      create: vi.fn(),
    },
    gstFilingEvent: {
      create: vi.fn(),
    },
  };

  return {
    mockTx: tx,
    mockDb: {
      orgDefaults: {
        findUnique: vi.fn(),
      },
      invoice: {
        findMany: vi.fn(),
      },
      gstFilingRun: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    mockLogAudit: vi.fn(),
    mockGenerateGstr1: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/env", () => ({
  env: {
    GST_FILING_PROVIDER: "manual",
  },
}));
vi.mock("@/lib/audit", () => ({
  logAudit: mockLogAudit,
}));
vi.mock("@/lib/gstr1-generator", () => ({
  generateGSTR1: mockGenerateGstr1,
}));

import {
  recordGstFilingReconciliation,
  recordGstFilingSubmissionIntent,
  recordGstFilingSubmissionResult,
  validateGstFilingRun,
} from "../filings";

const ORG_ID = "org-1";
const ACTOR_ID = "user-1";
const RUN_ID = "run-1";

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    customerId: "cust-1",
    customerGstin: "29ABCDE1234F1Z5",
    invoiceNumber: "INV-001",
    invoiceDate: "2025-01-15",
    placeOfSupply: "29-Karnataka",
    reverseCharge: false,
    exportType: null,
    totalAmount: 1180,
    gstTotalCgst: 90,
    gstTotalSgst: 90,
    gstTotalIgst: 0,
    gstTotalCess: 0,
    customer: {
      name: "Acme Corp",
      gstin: "29ABCDE1234F1Z5",
    },
    lineItems: [
      {
        amount: 1000,
        hsnCode: "9983",
        sacCode: null,
        gstType: "INTRASTATE",
        cgstAmount: 90,
        sgstAmount: 90,
        igstAmount: 0,
        cessAmount: 0,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.$transaction.mockImplementation(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));
  mockGenerateGstr1.mockResolvedValue({
    gstin: "29ABCDE1234F1Z5",
    fp: "012025",
    b2b: [],
    b2cs: [],
    b2cl: [],
    summary: {
      totalInvoices: 1,
      totalTaxableValue: 1000,
      totalCgst: 90,
      totalSgst: 90,
      totalIgst: 0,
      totalCess: 0,
      totalValue: 1180,
    },
  });
});

describe("validateGstFilingRun", () => {
  it("blocks a run when the organization GSTIN is missing", async () => {
    mockDb.gstFilingRun.findFirst.mockResolvedValue({
      id: RUN_ID,
      orgId: ORG_ID,
      periodMonth: "2025-01",
      status: "DRAFT",
      submissions: [],
    });
    mockDb.orgDefaults.findUnique.mockResolvedValue({
      gstin: null,
      gstStateCode: null,
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    mockDb.invoice.findMany.mockResolvedValue([]);
    mockTx.gstFilingRun.update.mockResolvedValue({
      id: RUN_ID,
      status: "BLOCKED",
    });

    await validateGstFilingRun({
      orgId: ORG_ID,
      actorId: ACTOR_ID,
      runId: RUN_ID,
    });

    expect(mockTx.gstFilingValidationIssue.createMany).toHaveBeenCalledTimes(1);
    expect(mockTx.gstFilingValidationIssue.createMany.mock.calls[0][0].data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ORG_GSTIN_MISSING",
          severity: "ERROR",
        }),
      ]),
    );
    expect(mockTx.gstFilingRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "BLOCKED",
          blockerCount: 1,
        }),
      }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "gst.filing.validated",
        entityId: RUN_ID,
      }),
    );
  });

  it("marks a clean run ready for submission", async () => {
    mockDb.gstFilingRun.findFirst.mockResolvedValue({
      id: RUN_ID,
      orgId: ORG_ID,
      periodMonth: "2025-01",
      status: "DRAFT",
      submissions: [],
    });
    mockDb.orgDefaults.findUnique.mockResolvedValue({
      gstin: "29ABCDE1234F1Z5",
      gstStateCode: "29",
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice()]);
    mockTx.gstFilingRun.update.mockResolvedValue({
      id: RUN_ID,
      status: "READY",
    });

    await validateGstFilingRun({
      orgId: ORG_ID,
      actorId: ACTOR_ID,
      runId: RUN_ID,
    });

    expect(mockTx.gstFilingValidationIssue.createMany).not.toHaveBeenCalled();
    expect(mockTx.gstFilingRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "READY",
          blockerCount: 0,
          warningCount: 0,
        }),
      }),
    );
  });
});

describe("recordGstFilingSubmissionIntent", () => {
  it("rejects submission when validation is stale", async () => {
    mockDb.gstFilingRun.findFirst.mockResolvedValue({
      id: RUN_ID,
      orgId: ORG_ID,
      periodMonth: "2025-01",
      status: "READY",
      validatedSnapshotHash: "stale-hash",
      returnType: "GSTR1",
      submissions: [],
    });
    mockDb.orgDefaults.findUnique.mockResolvedValue({
      gstin: "29ABCDE1234F1Z5",
      gstStateCode: "29",
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice()]);

    await expect(
      recordGstFilingSubmissionIntent({
        orgId: ORG_ID,
        actorId: ACTOR_ID,
        runId: RUN_ID,
      }),
    ).rejects.toThrow(/stale/i);

    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });
});

describe("recordGstFilingSubmissionResult", () => {
  it("moves a submitted run into reconciliation and creates a reconciliation record", async () => {
    mockDb.gstFilingRun.findFirst.mockResolvedValue({
      id: RUN_ID,
      orgId: ORG_ID,
      periodMonth: "2025-01",
      status: "SUBMISSION_PENDING",
      submittedByUserId: null,
      submittedAt: null,
      filedAt: null,
      submissions: [
        {
          id: "submission-1",
          attempt: 1,
          status: "INTENT_RECORDED",
        },
      ],
    });
    mockTx.gstFilingSubmission.update.mockResolvedValue({
      id: "submission-1",
      status: "ACKNOWLEDGED",
    });

    await recordGstFilingSubmissionResult({
      orgId: ORG_ID,
      actorId: ACTOR_ID,
      runId: RUN_ID,
      outcome: "submitted",
      externalReference: "ARN-123",
      acknowledgementNumber: "ACK-123",
      note: "Uploaded through manual portal flow",
    });

    expect(mockTx.gstFilingSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACKNOWLEDGED",
          externalReference: "ARN-123",
          acknowledgementNumber: "ACK-123",
        }),
      }),
    );
    expect(mockTx.gstFilingRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "RECONCILING",
        }),
      }),
    );
    expect(mockTx.gstFilingReconciliation.create).toHaveBeenCalledTimes(1);
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "gst.filing.submission_result",
      }),
    );
  });
});

describe("recordGstFilingReconciliation", () => {
  it("marks a fully matched reconciliation as reconciled", async () => {
    mockDb.gstFilingRun.findFirst.mockResolvedValue({
      id: RUN_ID,
      orgId: ORG_ID,
      periodMonth: "2025-01",
      status: "RECONCILING",
      reconciledAt: null,
      submissions: [],
    });
    mockTx.gstFilingReconciliation.create.mockResolvedValue({
      id: "recon-1",
      status: "MATCHED",
    });

    await recordGstFilingReconciliation({
      orgId: ORG_ID,
      actorId: ACTOR_ID,
      runId: RUN_ID,
      status: "MATCHED",
      matchedCount: 10,
      varianceCount: 0,
      note: "Portal and books fully aligned",
    });

    expect(mockTx.gstFilingRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "RECONCILED",
          reconciledAt: expect.any(Date),
        }),
      }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "gst.filing.reconciled",
      }),
    );
  });
});
