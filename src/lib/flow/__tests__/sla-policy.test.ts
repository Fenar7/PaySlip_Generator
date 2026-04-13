import { describe, it, expect } from "vitest";

/**
 * SLA policy validation tests.
 * Tests the validation logic for SLA policies inline.
 */

type SlaPolicyInput = {
  name: string;
  targetMins: number;
  isDefault?: boolean;
};

type ValidationResult = { valid: boolean; errors: string[] };

function validateSlaPolicyInput(input: SlaPolicyInput): ValidationResult {
  const errors: string[] = [];

  if (!input.name || !input.name.trim()) {
    errors.push("SLA policy name is required.");
  }

  if (!input.targetMins || input.targetMins <= 0) {
    errors.push("Target minutes must be greater than 0.");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates that only one SLA policy can be set as the default per org.
 * In practice, this is enforced in the action layer by checking existing defaults.
 */
function validateDefaultPolicyEnforcement(params: {
  isDefault: boolean;
  existingDefaultId?: string;
  currentPolicyId?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (
    params.isDefault &&
    params.existingDefaultId &&
    params.existingDefaultId !== params.currentPolicyId
  ) {
    errors.push(
      "An org can only have one default SLA policy. Unset the existing default before setting a new one."
    );
  }

  return { valid: errors.length === 0, errors };
}

describe("SLA policy name validation", () => {
  it("rejects empty name", () => {
    const result = validateSlaPolicyInput({
      name: "",
      targetMins: 60,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /name/i.test(e))).toBe(true);
  });

  it("rejects whitespace-only name", () => {
    const result = validateSlaPolicyInput({
      name: "    ",
      targetMins: 60,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /name/i.test(e))).toBe(true);
  });

  it("accepts a valid name", () => {
    const result = validateSlaPolicyInput({
      name: "Standard Response SLA",
      targetMins: 60,
    });
    expect(result.valid).toBe(true);
  });
});

describe("SLA policy targetMins validation", () => {
  it("accepts targetMins of 1", () => {
    const result = validateSlaPolicyInput({
      name: "Fast SLA",
      targetMins: 1,
    });
    expect(result.valid).toBe(true);
  });

  it("accepts large targetMins values", () => {
    const result = validateSlaPolicyInput({
      name: "Slow SLA",
      targetMins: 43200, // 30 days in minutes
    });
    expect(result.valid).toBe(true);
  });

  it("rejects targetMins of 0", () => {
    const result = validateSlaPolicyInput({
      name: "Invalid SLA",
      targetMins: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /target minutes/i.test(e))).toBe(true);
  });

  it("rejects negative targetMins", () => {
    const result = validateSlaPolicyInput({
      name: "Invalid SLA",
      targetMins: -30,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /target minutes/i.test(e))).toBe(true);
  });

  it("fails with both empty name and invalid targetMins", () => {
    const result = validateSlaPolicyInput({
      name: "",
      targetMins: -1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});

describe("SLA policy default enforcement", () => {
  it("allows setting default when no existing default", () => {
    const result = validateDefaultPolicyEnforcement({
      isDefault: true,
      existingDefaultId: undefined,
    });
    expect(result.valid).toBe(true);
  });

  it("allows setting default when existing default is the same policy (update case)", () => {
    const result = validateDefaultPolicyEnforcement({
      isDefault: true,
      existingDefaultId: "policy-abc",
      currentPolicyId: "policy-abc",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects setting default when a different policy is already the default", () => {
    const result = validateDefaultPolicyEnforcement({
      isDefault: true,
      existingDefaultId: "policy-other",
      currentPolicyId: "policy-new",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /one default/i.test(e))).toBe(true);
  });

  it("does not apply default constraint when isDefault=false", () => {
    const result = validateDefaultPolicyEnforcement({
      isDefault: false,
      existingDefaultId: "policy-abc",
      currentPolicyId: "policy-new",
    });
    expect(result.valid).toBe(true);
  });

  it("allows multiple non-default policies to coexist", () => {
    // Each non-default policy should pass independently
    const resultA = validateDefaultPolicyEnforcement({ isDefault: false });
    const resultB = validateDefaultPolicyEnforcement({ isDefault: false });
    expect(resultA.valid).toBe(true);
    expect(resultB.valid).toBe(true);
  });
});
