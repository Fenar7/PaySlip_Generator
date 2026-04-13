import { describe, it, expect } from "vitest";

/**
 * Escalation rules validation tests.
 * Tests the validation logic enforced by the escalation rule actions.
 *
 * We extract the pure validation rules here to verify them independently.
 */

const SUPPORTED_BREACH_TYPES = [
  "approval_breach",
  "first_response_breach",
  "resolution_breach",
  "delivery_failure",
  "dead_letter_summary",
] as const;

type SupportedBreachType = (typeof SUPPORTED_BREACH_TYPES)[number];

type EscalationRuleInput = {
  name: string;
  breachType: string;
  afterMins: number;
  targetRole?: string;
  targetUserId?: string;
  notifyOrgAdmins?: boolean;
};

function validateEscalationInput(input: EscalationRuleInput): string | null {
  if (!SUPPORTED_BREACH_TYPES.includes(input.breachType as SupportedBreachType)) {
    return `Unsupported breach type: ${input.breachType}`;
  }
  if (!input.afterMins || input.afterMins <= 0) {
    return "After minutes must be greater than 0";
  }
  if (!input.targetRole && !input.targetUserId && !input.notifyOrgAdmins) {
    return "At least one target is required: targetRole, targetUserId, or notifyOrgAdmins";
  }
  return null;
}

describe("Escalation rule breach type validation", () => {
  it("accepts all valid breach types", () => {
    for (const bt of SUPPORTED_BREACH_TYPES) {
      const error = validateEscalationInput({
        name: "Test Rule",
        breachType: bt,
        afterMins: 30,
        targetRole: "manager",
      });
      expect(error).toBeNull();
    }
  });

  it("rejects an invalid breach type", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "invalid_breach",
      afterMins: 30,
      targetRole: "manager",
    });
    expect(error).not.toBeNull();
    expect(error).toContain("invalid_breach");
  });

  it("rejects an empty breach type", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "",
      afterMins: 30,
      targetRole: "manager",
    });
    expect(error).not.toBeNull();
  });

  it("is case-sensitive — uppercase breach type fails", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "APPROVAL_BREACH",
      afterMins: 30,
      targetRole: "manager",
    });
    expect(error).not.toBeNull();
  });
});

describe("Escalation rule afterMins validation", () => {
  it("accepts afterMins of 1", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "approval_breach",
      afterMins: 1,
      targetRole: "manager",
    });
    expect(error).toBeNull();
  });

  it("accepts large afterMins values", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "approval_breach",
      afterMins: 10080,
      targetRole: "manager",
    });
    expect(error).toBeNull();
  });

  it("rejects afterMins of 0", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "approval_breach",
      afterMins: 0,
      targetRole: "manager",
    });
    expect(error).not.toBeNull();
    expect(error).toContain("greater than 0");
  });

  it("rejects negative afterMins", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "approval_breach",
      afterMins: -5,
      targetRole: "manager",
    });
    expect(error).not.toBeNull();
  });
});

describe("Escalation rule target validation", () => {
  it("accepts rule with only targetRole", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "approval_breach",
      afterMins: 30,
      targetRole: "finance_manager",
    });
    expect(error).toBeNull();
  });

  it("accepts rule with only targetUserId", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "approval_breach",
      afterMins: 30,
      targetUserId: "user-uuid-1234",
    });
    expect(error).toBeNull();
  });

  it("accepts rule with only notifyOrgAdmins=true", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "approval_breach",
      afterMins: 30,
      notifyOrgAdmins: true,
    });
    expect(error).toBeNull();
  });

  it("accepts rule with all targets specified", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "approval_breach",
      afterMins: 30,
      targetRole: "manager",
      targetUserId: "user-uuid-1234",
      notifyOrgAdmins: true,
    });
    expect(error).toBeNull();
  });

  it("rejects rule with no target (no targetRole, no targetUserId, notifyOrgAdmins=false)", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "approval_breach",
      afterMins: 30,
      notifyOrgAdmins: false,
    });
    expect(error).not.toBeNull();
    expect(error).toContain("At least one target");
  });

  it("rejects rule with undefined targets", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "approval_breach",
      afterMins: 30,
    });
    expect(error).not.toBeNull();
    expect(error).toContain("At least one target");
  });

  it("rejects rule with notifyOrgAdmins explicitly false and no other targets", () => {
    const error = validateEscalationInput({
      name: "Test Rule",
      breachType: "approval_breach",
      afterMins: 30,
      notifyOrgAdmins: false,
    });
    expect(error).not.toBeNull();
  });
});
