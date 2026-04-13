import { describe, it, expect } from "vitest";

/**
 * Approval policy validation tests.
 * Tests the validation logic for approval policies inline.
 */

const SUPPORTED_MODULES = [
  "invoices",
  "vouchers",
  "vendor_bills",
  "payment_runs",
  "close",
] as const;

type SupportedModule = (typeof SUPPORTED_MODULES)[number];

type ApprovalRuleInput = {
  minAmount?: number;
  maxAmount?: number;
  approverRole?: string;
  approverUserId?: string;
};

type ApprovalPolicyInput = {
  name: string;
  module: string;
  rules?: ApprovalRuleInput[];
};

type ValidationResult = { valid: boolean; errors: string[] };

function validateApprovalPolicy(input: ApprovalPolicyInput): ValidationResult {
  const errors: string[] = [];

  if (!input.name || !input.name.trim()) {
    errors.push("Policy name is required.");
  }

  if (!SUPPORTED_MODULES.includes(input.module as SupportedModule)) {
    errors.push(`Module "${input.module}" is not valid. Supported: ${SUPPORTED_MODULES.join(", ")}`);
  }

  for (const rule of input.rules ?? []) {
    if (
      rule.minAmount !== undefined &&
      rule.maxAmount !== undefined &&
      rule.minAmount >= rule.maxAmount
    ) {
      errors.push(
        `Rule amount range invalid: minAmount (${rule.minAmount}) must be less than maxAmount (${rule.maxAmount}).`
      );
    }

    if (!rule.approverRole && !rule.approverUserId) {
      errors.push("Each rule must have at least an approverRole or approverUserId.");
    }
  }

  return { valid: errors.length === 0, errors };
}

describe("Approval policy name validation", () => {
  it("rejects empty name", () => {
    const result = validateApprovalPolicy({
      name: "",
      module: "invoices",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /name/i.test(e))).toBe(true);
  });

  it("rejects whitespace-only name", () => {
    const result = validateApprovalPolicy({
      name: "   ",
      module: "invoices",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /name/i.test(e))).toBe(true);
  });

  it("accepts a valid name", () => {
    const result = validateApprovalPolicy({
      name: "Invoice Approval Policy",
      module: "invoices",
    });
    expect(result.valid).toBe(true);
  });
});

describe("Approval policy module validation", () => {
  it("accepts all valid modules", () => {
    for (const mod of SUPPORTED_MODULES) {
      const result = validateApprovalPolicy({
        name: "Test Policy",
        module: mod,
      });
      expect(result.valid).toBe(true);
    }
  });

  it("rejects an invalid module", () => {
    const result = validateApprovalPolicy({
      name: "Test Policy",
      module: "blockchain_approvals",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("blockchain_approvals"))).toBe(true);
  });

  it("rejects an empty module", () => {
    const result = validateApprovalPolicy({
      name: "Test Policy",
      module: "",
    });
    expect(result.valid).toBe(false);
  });
});

describe("Approval policy rule threshold validation", () => {
  it("accepts rule where minAmount < maxAmount", () => {
    const result = validateApprovalPolicy({
      name: "Policy",
      module: "invoices",
      rules: [{ minAmount: 100, maxAmount: 5000, approverRole: "manager" }],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects rule where minAmount >= maxAmount (equal)", () => {
    const result = validateApprovalPolicy({
      name: "Policy",
      module: "invoices",
      rules: [{ minAmount: 1000, maxAmount: 1000, approverRole: "manager" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /minAmount/i.test(e))).toBe(true);
  });

  it("rejects rule where minAmount > maxAmount", () => {
    const result = validateApprovalPolicy({
      name: "Policy",
      module: "invoices",
      rules: [{ minAmount: 9000, maxAmount: 100, approverRole: "manager" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /minAmount/i.test(e))).toBe(true);
  });

  it("accepts rule with only minAmount set", () => {
    const result = validateApprovalPolicy({
      name: "Policy",
      module: "invoices",
      rules: [{ minAmount: 500, approverRole: "manager" }],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts rule with only maxAmount set", () => {
    const result = validateApprovalPolicy({
      name: "Policy",
      module: "invoices",
      rules: [{ maxAmount: 5000, approverRole: "manager" }],
    });
    expect(result.valid).toBe(true);
  });
});

describe("Approval policy rule approver target validation", () => {
  it("accepts rule with approverRole only", () => {
    const result = validateApprovalPolicy({
      name: "Policy",
      module: "invoices",
      rules: [{ approverRole: "finance_manager" }],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts rule with approverUserId only", () => {
    const result = validateApprovalPolicy({
      name: "Policy",
      module: "invoices",
      rules: [{ approverUserId: "user-uuid-1234" }],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts rule with both approverRole and approverUserId", () => {
    const result = validateApprovalPolicy({
      name: "Policy",
      module: "invoices",
      rules: [{ approverRole: "manager", approverUserId: "user-uuid-1234" }],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects rule with neither approverRole nor approverUserId", () => {
    const result = validateApprovalPolicy({
      name: "Policy",
      module: "invoices",
      rules: [{}],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /approver/i.test(e))).toBe(true);
  });

  it("rejects rule with explicitly empty approverRole and no approverUserId", () => {
    const result = validateApprovalPolicy({
      name: "Policy",
      module: "invoices",
      rules: [{ approverRole: "", approverUserId: undefined }],
    });
    expect(result.valid).toBe(false);
  });

  it("collects errors from multiple invalid rules", () => {
    const result = validateApprovalPolicy({
      name: "Policy",
      module: "invoices",
      rules: [
        {}, // no approver
        {}, // no approver
      ],
    });
    expect(result.errors.filter((e) => /approver/i.test(e))).toHaveLength(2);
  });
});
