import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted — use vi.fn() inside the factory, not an outer const
vi.mock("@/lib/db", () => ({
  db: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// Mock the generated Prisma client for Prisma.DbNull and Prisma.InputJsonValue
vi.mock("@/generated/prisma/client", () => ({
  Prisma: {
    DbNull: "DbNull",
    InputJsonValue: undefined,
  },
}));

import { logFlowConfigChange } from "@/lib/flow/audit";
import { db } from "@/lib/db";

// Typed reference to the mocked function
const mockAuditLogCreate = db.auditLog.create as ReturnType<typeof vi.fn>;

describe("logFlowConfigChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an audit log entry with the correct fields", async () => {
    mockAuditLogCreate.mockResolvedValueOnce({ id: "audit-1" });

    await logFlowConfigChange({
      orgId: "org-123",
      actorId: "user-456",
      action: "escalation_rule.created",
      entityType: "TicketEscalationRule",
      entityId: "rule-789",
      metadata: { name: "Test Rule", breachType: "approval_breach" },
    });

    expect(mockAuditLogCreate).toHaveBeenCalledOnce();
    const callArgs = mockAuditLogCreate.mock.calls[0][0];
    expect(callArgs.data.orgId).toBe("org-123");
    expect(callArgs.data.actorId).toBe("user-456");
    expect(callArgs.data.action).toBe("escalation_rule.created");
    expect(callArgs.data.entityType).toBe("TicketEscalationRule");
    expect(callArgs.data.entityId).toBe("rule-789");
  });

  it("passes metadata to the audit log entry", async () => {
    mockAuditLogCreate.mockResolvedValueOnce({ id: "audit-2" });

    await logFlowConfigChange({
      orgId: "org-123",
      actorId: "user-456",
      action: "escalation_rule.updated",
      entityType: "TicketEscalationRule",
      entityId: "rule-789",
      metadata: { previousEnabled: true, newEnabled: false },
    });

    expect(mockAuditLogCreate).toHaveBeenCalledOnce();
    const callArgs = mockAuditLogCreate.mock.calls[0][0];
    expect(callArgs.data.metadata).toEqual({ previousEnabled: true, newEnabled: false });
  });

  it("uses DbNull when metadata is not provided", async () => {
    mockAuditLogCreate.mockResolvedValueOnce({ id: "audit-3" });

    await logFlowConfigChange({
      orgId: "org-123",
      actorId: "user-456",
      action: "workflow.created",
      entityType: "WorkflowDefinition",
      entityId: "wf-111",
    });

    expect(mockAuditLogCreate).toHaveBeenCalledOnce();
    const callArgs = mockAuditLogCreate.mock.calls[0][0];
    expect(callArgs.data.metadata).toBe("DbNull");
  });

  it("does not throw when db.auditLog.create rejects", async () => {
    mockAuditLogCreate.mockRejectedValueOnce(new Error("DB connection failed"));

    // Should NOT throw
    await expect(
      logFlowConfigChange({
        orgId: "org-123",
        actorId: "user-456",
        action: "escalation_rule.deleted",
        entityType: "TicketEscalationRule",
        entityId: "rule-789",
      })
    ).resolves.not.toThrow();
  });

  it("handles error gracefully without re-throwing", async () => {
    mockAuditLogCreate.mockRejectedValueOnce(new Error("Timeout"));

    let threw = false;
    try {
      await logFlowConfigChange({
        orgId: "org-abc",
        actorId: "actor-xyz",
        action: "sla_policy.created",
        entityType: "SlaPolicy",
        entityId: "sla-001",
      });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
  });

  it("creates audit log for workflow actions with correct entity type", async () => {
    mockAuditLogCreate.mockResolvedValueOnce({ id: "audit-4" });

    await logFlowConfigChange({
      orgId: "org-123",
      actorId: "user-456",
      action: "workflow.activated",
      entityType: "WorkflowDefinition",
      entityId: "wf-999",
    });

    expect(mockAuditLogCreate).toHaveBeenCalledOnce();
    expect(mockAuditLogCreate.mock.calls[0][0].data.entityType).toBe("WorkflowDefinition");
    expect(mockAuditLogCreate.mock.calls[0][0].data.action).toBe("workflow.activated");
  });
});
