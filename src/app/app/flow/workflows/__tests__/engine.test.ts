/**
 * Sprint 25.1 — Workflow Engine Unit Tests
 *
 * Tests for:
 *  - evaluateCondition() with all 6 operators
 *  - fireWorkflowTrigger() with idempotency guard
 *  - Trigger dispatch skips unknown trigger types
 *  - Condition-skipped step recorded as CANCELLED
 *  - Failed step triggers failure notification path (unit-testable part)
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { evaluateCondition } from "@/lib/flow/workflow-engine";

// ─── evaluateCondition ────────────────────────────────────────────────────────

describe("evaluateCondition", () => {
  const ctx = { amount: 500, status: "PAID", label: "invoice" };

  it("== returns true when equal", () => {
    expect(evaluateCondition({ field: "status", operator: "==", value: "PAID" }, ctx)).toBe(true);
  });

  it("== returns false when not equal", () => {
    expect(evaluateCondition({ field: "status", operator: "==", value: "DRAFT" }, ctx)).toBe(false);
  });

  it("!= returns true when not equal", () => {
    expect(evaluateCondition({ field: "status", operator: "!=", value: "DRAFT" }, ctx)).toBe(true);
  });

  it("!= returns false when equal", () => {
    expect(evaluateCondition({ field: "status", operator: "!=", value: "PAID" }, ctx)).toBe(false);
  });

  it("> returns true when actual > expected", () => {
    expect(evaluateCondition({ field: "amount", operator: ">", value: 100 }, ctx)).toBe(true);
  });

  it("> returns false when actual <= expected", () => {
    expect(evaluateCondition({ field: "amount", operator: ">", value: 1000 }, ctx)).toBe(false);
  });

  it(">= returns true when equal", () => {
    expect(evaluateCondition({ field: "amount", operator: ">=", value: 500 }, ctx)).toBe(true);
  });

  it("< returns true when actual < expected", () => {
    expect(evaluateCondition({ field: "amount", operator: "<", value: 1000 }, ctx)).toBe(true);
  });

  it("<= returns true when equal", () => {
    expect(evaluateCondition({ field: "amount", operator: "<=", value: 500 }, ctx)).toBe(true);
  });

  it("returns true for unknown operator (safe default)", () => {
    // @ts-expect-error — testing defensive default
    expect(evaluateCondition({ field: "amount", operator: "~=", value: 500 }, ctx)).toBe(true);
  });

  it("returns false when field is missing from context and operator is ==", () => {
    expect(evaluateCondition({ field: "missing", operator: "==", value: "x" }, ctx)).toBe(false);
  });
});

// ─── fireWorkflowTrigger — idempotency & dispatch ────────────────────────────

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    db: {
      workflowDefinition: {
        findMany: vi.fn(),
      },
      workflowRun: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
      workflowStepRun: {
        create: vi.fn(),
        update: vi.fn(),
      },
      scheduledAction: {
        create: vi.fn(),
      },
      invoiceTicket: { update: vi.fn() },
      invoice: { update: vi.fn() },
    },
  };
});

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
  notifyOrgAdmins: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/flow/approvals", () => ({
  createApprovalRequest: vi.fn(),
}));

import { fireWorkflowTrigger } from "@/lib/flow/workflow-engine";
import { db } from "@/lib/db";

const dbMock = db as {
  workflowDefinition: { findMany: Mock };
  workflowRun: { create: Mock; update: Mock; findFirst: Mock };
  workflowStepRun: { create: Mock; update: Mock };
  scheduledAction: { create: Mock };
};

const baseEvent = {
  triggerType: "invoice.created" as const,
  orgId: "org-1",
  sourceModule: "invoices",
  sourceEntityType: "Invoice",
  sourceEntityId: "inv-1",
  actorId: "user-1",
  payload: { invoiceNumber: "INV-001", totalAmount: 5000 },
};

const activeWorkflow = {
  id: "wf-1",
  orgId: "org-1",
  triggerType: "invoice.created",
  status: "ACTIVE",
  createdBy: "user-1",
  steps: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.workflowRun.create.mockResolvedValue({ id: "run-1", status: "PENDING" });
  dbMock.workflowRun.update.mockResolvedValue({});
  dbMock.workflowStepRun.create.mockResolvedValue({ id: "sr-1" });
  dbMock.workflowStepRun.update.mockResolvedValue({});
  dbMock.scheduledAction.create.mockResolvedValue({ id: "sa-1" });
});

describe("fireWorkflowTrigger — unknown trigger", () => {
  it("skips execution for unknown trigger type", async () => {
    dbMock.workflowDefinition.findMany.mockResolvedValue([]);
    await fireWorkflowTrigger({
      ...baseEvent,
      // @ts-expect-error — testing bad trigger
      triggerType: "definitely.unknown",
    });
    expect(dbMock.workflowDefinition.findMany).not.toHaveBeenCalled();
  });
});

describe("fireWorkflowTrigger — no matching workflows", () => {
  it("does nothing when no active workflows match the trigger", async () => {
    dbMock.workflowDefinition.findMany.mockResolvedValue([]);
    await fireWorkflowTrigger(baseEvent);
    expect(dbMock.workflowRun.create).not.toHaveBeenCalled();
  });
});

describe("fireWorkflowTrigger — idempotency guard", () => {
  it("skips execution when an in-flight run exists for the same entity", async () => {
    dbMock.workflowDefinition.findMany.mockResolvedValue([activeWorkflow]);
    dbMock.workflowRun.findFirst.mockResolvedValue({
      id: "run-existing",
      status: "RUNNING",
    });

    await fireWorkflowTrigger(baseEvent);

    expect(dbMock.workflowRun.create).not.toHaveBeenCalled();
  });

  it("proceeds when no recent in-flight run exists", async () => {
    dbMock.workflowDefinition.findMany.mockResolvedValue([activeWorkflow]);
    dbMock.workflowRun.findFirst.mockResolvedValue(null);

    await fireWorkflowTrigger(baseEvent);

    expect(dbMock.workflowRun.create).toHaveBeenCalledOnce();
  });
});

describe("fireWorkflowTrigger — depth guard", () => {
  it("does not exceed max depth", async () => {
    dbMock.workflowDefinition.findMany.mockResolvedValue([]);
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await fireWorkflowTrigger({ ...baseEvent, depth: 10 });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Max depth reached")
    );
    consoleSpy.mockRestore();
  });
});

describe("fireWorkflowTrigger — step with condition skipped", () => {
  it("marks step run as CANCELLED when condition is not met", async () => {
    const workflowWithConditionStep = {
      ...activeWorkflow,
      steps: [
        {
          id: "step-1",
          sequence: 1,
          actionType: "add_audit_log",
          config: { message: "test" },
          conditionJson: { field: "totalAmount", operator: ">", value: 99999 },
          label: "High-value only",
        },
      ],
    };

    dbMock.workflowDefinition.findMany.mockResolvedValue([workflowWithConditionStep]);
    dbMock.workflowRun.findFirst.mockResolvedValue(null);
    dbMock.workflowRun.create.mockResolvedValue({ id: "run-2", status: "PENDING" });

    await fireWorkflowTrigger(baseEvent);

    // The engine creates a step run directly with status CANCELLED (no separate update)
    expect(dbMock.workflowStepRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED" }),
      })
    );
  });
});

describe("fireWorkflowTrigger — wait steps", () => {
  it("sanitizes invalid actor IDs and pauses the run for resumption", async () => {
    const workflowWithWait = {
      ...activeWorkflow,
      steps: [
        {
          id: "step-wait",
          sequence: 1,
          actionType: "wait",
          config: { delayHours: 2 },
          conditionJson: null,
          label: "Pause before next step",
        },
      ],
    };

    dbMock.workflowDefinition.findMany.mockResolvedValue([workflowWithWait]);
    dbMock.workflowRun.findFirst.mockResolvedValue(null);

    await fireWorkflowTrigger({ ...baseEvent, actorId: "public" });

    expect(dbMock.workflowRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actorId: null }),
      }),
    );
    expect(dbMock.scheduledAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: "resume_workflow_run",
          workflowRunId: "run-1",
        }),
      }),
    );
    expect(dbMock.workflowRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({ status: "PENDING", completedAt: null }),
      }),
    );
  });
});
