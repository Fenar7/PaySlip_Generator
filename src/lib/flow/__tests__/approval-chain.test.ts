import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Sprint 25.2: Multi-step Approval Chain Logic Tests
 *
 * Tests the approval chain advancement, delegation resolution, and escalation
 * logic in isolation using inline implementations that mirror the real engine.
 */

// ─── Inline chain-advancement logic (mirrors approvals.ts) ────────────────────

interface PolicyRule {
  id: string;
  policyId: string;
  sequence: number;
  escalateAfterHours: number | null;
  allowDelegation: boolean;
  approverUserId: string | null;
  approverRole: string | null;
  approvalMode: string;
}

interface ApprovalRequest {
  id: string;
  orgId: string;
  policyId: string | null;
  currentRuleOrder: number;
  docType: string;
  status: string;
}

interface Delegation {
  fromUserId: string;
  toUserId: string;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date;
}

function resolveDelegate(
  userId: string,
  delegations: Delegation[],
  now = new Date(),
): string {
  const active = delegations.find(
    (d) =>
      d.fromUserId === userId &&
      d.isActive &&
      d.validFrom <= now &&
      d.validUntil >= now,
  );
  return active ? active.toUserId : userId;
}

function advanceChain(
  request: ApprovalRequest,
  rules: PolicyRule[],
  decision: "APPROVED" | "REJECTED",
): { status: "APPROVED" | "REJECTED" | "PENDING"; nextRuleSequence?: number } {
  if (decision === "REJECTED") return { status: "REJECTED" };

  if (!request.policyId) return { status: "APPROVED" };

  const nextRule = rules
    .filter((r) => r.policyId === request.policyId && r.sequence > request.currentRuleOrder)
    .sort((a, b) => a.sequence - b.sequence)[0];

  if (nextRule) {
    return { status: "PENDING", nextRuleSequence: nextRule.sequence };
  }

  return { status: "APPROVED" };
}

function resolveApplicablePolicy(
  policies: Array<{ id: string; module: string; minAmount: number | null; maxAmount: number | null; rules: PolicyRule[] }>,
  docType: string,
  amount?: number,
) {
  const matching = policies.filter(
    (p) => p.module === docType,
  );

  if (!matching.length) return null;
  if (amount == null) return matching[0];

  const scoped = matching.find((p) => {
    if (!p.minAmount && !p.maxAmount) return false;
    const meetsMin = p.minAmount == null || amount >= p.minAmount;
    const meetsMax = p.maxAmount == null || amount <= p.maxAmount;
    return meetsMin && meetsMax;
  });

  return scoped ?? matching[0];
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("advanceChain — single step", () => {
  const rules: PolicyRule[] = [
    { id: "r1", policyId: "p1", sequence: 1, escalateAfterHours: null, allowDelegation: true, approverUserId: null, approverRole: "manager", approvalMode: "any_one" },
  ];
  const request: ApprovalRequest = { id: "req1", orgId: "org1", policyId: "p1", currentRuleOrder: 1, docType: "invoice", status: "PENDING" };

  it("APPROVED when single rule approved and no more rules", () => {
    expect(advanceChain(request, rules, "APPROVED")).toEqual({ status: "APPROVED" });
  });

  it("REJECTED on rejection regardless of remaining rules", () => {
    expect(advanceChain(request, rules, "REJECTED")).toEqual({ status: "REJECTED" });
  });
});

describe("advanceChain — multi-step", () => {
  const rules: PolicyRule[] = [
    { id: "r1", policyId: "p1", sequence: 1, escalateAfterHours: 24, allowDelegation: true, approverUserId: null, approverRole: "dept_head", approvalMode: "any_one" },
    { id: "r2", policyId: "p1", sequence: 2, escalateAfterHours: 48, allowDelegation: true, approverUserId: null, approverRole: "cfo", approvalMode: "any_one" },
    { id: "r3", policyId: "p1", sequence: 3, escalateAfterHours: null, allowDelegation: false, approverUserId: "ceo-uuid", approverRole: null, approvalMode: "any_one" },
  ];

  const req = (currentRuleOrder: number): ApprovalRequest => ({
    id: "req1", orgId: "org1", policyId: "p1", currentRuleOrder, docType: "payment-run", status: "PENDING",
  });

  it("advances from step 1 to step 2 on APPROVED", () => {
    const result = advanceChain(req(1), rules, "APPROVED");
    expect(result.status).toBe("PENDING");
    expect(result.nextRuleSequence).toBe(2);
  });

  it("advances from step 2 to step 3 on APPROVED", () => {
    const result = advanceChain(req(2), rules, "APPROVED");
    expect(result.status).toBe("PENDING");
    expect(result.nextRuleSequence).toBe(3);
  });

  it("finalizes on APPROVED at last step", () => {
    const result = advanceChain(req(3), rules, "APPROVED");
    expect(result.status).toBe("APPROVED");
  });

  it("always REJECTS immediately regardless of step", () => {
    expect(advanceChain(req(1), rules, "REJECTED").status).toBe("REJECTED");
    expect(advanceChain(req(2), rules, "REJECTED").status).toBe("REJECTED");
    expect(advanceChain(req(3), rules, "REJECTED").status).toBe("REJECTED");
  });
});

describe("advanceChain — no policy", () => {
  it("auto-approves when there is no policy (no-policy flow)", () => {
    const request: ApprovalRequest = { id: "req1", orgId: "org1", policyId: null, currentRuleOrder: 1, docType: "voucher", status: "PENDING" };
    expect(advanceChain(request, [], "APPROVED")).toEqual({ status: "APPROVED" });
  });
});

describe("resolveDelegate", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  const future = new Date("2026-06-10T00:00:00Z");
  const past = new Date("2026-05-20T00:00:00Z");
  const yesterday = new Date("2026-05-31T00:00:00Z");

  it("returns original userId when no delegation exists", () => {
    expect(resolveDelegate("user1", [], now)).toBe("user1");
  });

  it("returns toUserId when active delegation covers now", () => {
    const delegations: Delegation[] = [{
      fromUserId: "user1", toUserId: "user2", isActive: true, validFrom: yesterday, validUntil: future,
    }];
    expect(resolveDelegate("user1", delegations, now)).toBe("user2");
  });

  it("ignores inactive delegation", () => {
    const delegations: Delegation[] = [{
      fromUserId: "user1", toUserId: "user2", isActive: false, validFrom: yesterday, validUntil: future,
    }];
    expect(resolveDelegate("user1", delegations, now)).toBe("user1");
  });

  it("ignores expired delegation (validUntil in past)", () => {
    const delegations: Delegation[] = [{
      fromUserId: "user1", toUserId: "user2", isActive: true, validFrom: past, validUntil: yesterday,
    }];
    expect(resolveDelegate("user1", delegations, now)).toBe("user1");
  });

  it("ignores future delegation (validFrom in future)", () => {
    const delegations: Delegation[] = [{
      fromUserId: "user1", toUserId: "user2", isActive: true, validFrom: future, validUntil: new Date("2026-06-20T00:00:00Z"),
    }];
    expect(resolveDelegate("user1", delegations, now)).toBe("user1");
  });
});

describe("resolveApplicablePolicy — threshold routing", () => {
  const baseRules: PolicyRule[] = [];

  const policies = [
    { id: "p-low", module: "invoice", minAmount: null, maxAmount: 50000, rules: baseRules },
    { id: "p-high", module: "invoice", minAmount: 50001, maxAmount: null, rules: baseRules },
    { id: "p-any", module: "voucher", minAmount: null, maxAmount: null, rules: baseRules },
  ];

  it("selects low-value policy for amount within range", () => {
    const policy = resolveApplicablePolicy(policies, "invoice", 25000);
    expect(policy?.id).toBe("p-low");
  });

  it("selects high-value policy for amount above threshold", () => {
    const policy = resolveApplicablePolicy(policies, "invoice", 75000);
    expect(policy?.id).toBe("p-high");
  });

  it("falls back to first policy when amount matches no scoped policy", () => {
    const policy = resolveApplicablePolicy(policies, "invoice", 50000);
    // 50000 matches p-low (maxAmount 50000), inclusive
    expect(policy?.id).toBe("p-low");
  });

  it("returns first policy when no amount is given", () => {
    const policy = resolveApplicablePolicy(policies, "invoice");
    expect(policy?.id).toBe("p-low");
  });

  it("returns null when no policies exist for docType", () => {
    const policy = resolveApplicablePolicy(policies, "salary-slip", 10000);
    expect(policy).toBeNull();
  });

  it("returns catch-all policy for any amount when no min/max set", () => {
    const policy = resolveApplicablePolicy(policies, "voucher", 999999);
    expect(policy?.id).toBe("p-any");
  });
});
