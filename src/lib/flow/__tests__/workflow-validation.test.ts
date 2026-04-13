import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock workflow-engine before importing workflow-validation
vi.mock("@/lib/flow/workflow-engine", () => ({
  SUPPORTED_TRIGGERS: [
    "invoice.issued",
    "invoice.overdue",
    "payment_proof.submitted",
    "ticket.opened",
    "approval.requested",
    "approval.breached",
    "vendor_bill.submitted",
    "payment_run.failed",
    "close_task.blocked",
    "scheduled_action.dead_lettered",
  ],
  SUPPORTED_ACTIONS: [
    "assign_ticket",
    "create_approval_request",
    "send_notification",
    "schedule_reminder",
    "escalate_to_role",
    "enqueue_scheduled_action",
    "create_follow_up",
    "notify_org_admins",
  ],
}));

import {
  validateTriggerType,
  validateActionType,
  validateWorkflowForActivation,
} from "@/lib/flow/workflow-validation";

describe("validateTriggerType", () => {
  it("returns valid=true for a supported trigger", () => {
    const result = validateTriggerType("invoice.issued");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns valid=true for all supported triggers", () => {
    const triggers = [
      "invoice.issued",
      "invoice.overdue",
      "payment_proof.submitted",
      "ticket.opened",
      "approval.requested",
      "approval.breached",
      "vendor_bill.submitted",
      "payment_run.failed",
      "close_task.blocked",
      "scheduled_action.dead_lettered",
    ];
    for (const trigger of triggers) {
      expect(validateTriggerType(trigger).valid).toBe(true);
    }
  });

  it("returns valid=false for an unsupported trigger", () => {
    const result = validateTriggerType("unknown.trigger");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("unknown.trigger");
  });

  it("returns valid=false for an empty string trigger", () => {
    const result = validateTriggerType("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("is case-sensitive — uppercase trigger fails", () => {
    const result = validateTriggerType("INVOICE.ISSUED");
    expect(result.valid).toBe(false);
  });
});

describe("validateActionType", () => {
  it("returns valid=true for a supported action", () => {
    const result = validateActionType("send_notification");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns valid=true for all supported actions", () => {
    const actions = [
      "assign_ticket",
      "create_approval_request",
      "send_notification",
      "schedule_reminder",
      "escalate_to_role",
      "enqueue_scheduled_action",
      "create_follow_up",
      "notify_org_admins",
    ];
    for (const action of actions) {
      expect(validateActionType(action).valid).toBe(true);
    }
  });

  it("returns valid=false for an unsupported action", () => {
    const result = validateActionType("delete_everything");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("delete_everything");
  });

  it("returns valid=false for an empty string action", () => {
    const result = validateActionType("");
    expect(result.valid).toBe(false);
  });
});

describe("validateWorkflowForActivation", () => {
  it("returns valid=true for a workflow with valid steps", () => {
    const workflow = {
      steps: [
        { actionType: "send_notification" },
        { actionType: "assign_ticket" },
      ],
    };
    const result = validateWorkflowForActivation(workflow);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid=false for a workflow with no steps", () => {
    const workflow = { steps: [] };
    const result = validateWorkflowForActivation(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/at least one step/i);
  });

  it("returns valid=false for a workflow with an invalid action type in a step", () => {
    const workflow = {
      steps: [{ actionType: "invalid_action_xyz" }],
    };
    const result = validateWorkflowForActivation(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("invalid_action_xyz"))).toBe(true);
  });

  it("collects multiple errors for multiple invalid steps", () => {
    const workflow = {
      steps: [
        { actionType: "bad_action_1" },
        { actionType: "bad_action_2" },
      ],
    };
    const result = validateWorkflowForActivation(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("returns valid=false for empty steps and errors include the step message", () => {
    const result = validateWorkflowForActivation({ steps: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).not.toHaveLength(0);
  });

  it("returns valid=true for single valid step", () => {
    const result = validateWorkflowForActivation({
      steps: [{ actionType: "notify_org_admins" }],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
