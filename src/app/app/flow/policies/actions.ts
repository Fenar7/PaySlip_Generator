"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logFlowConfigChange } from "@/lib/flow/audit";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const VALID_MODULES = ["invoices", "vouchers", "vendor_bills", "payment_runs", "close"] as const;

export async function createApprovalPolicy(input: {
  name: string;
  module: string;
  eventType: string;
  stepMode: "SINGLE" | "SEQUENTIAL";
  escalateAfterMins?: number;
}): Promise<ActionResult<{ id: string }>> {
  const { orgId, userId } = await requireRole("admin");

  if (!input.name?.trim()) {
    return { success: false, error: "Policy name is required" };
  }
  if (!VALID_MODULES.includes(input.module as never)) {
    return { success: false, error: `Invalid module. Must be one of: ${VALID_MODULES.join(", ")}` };
  }

  const policy = await db.approvalPolicy.create({
    data: {
      orgId,
      name: input.name.trim(),
      module: input.module,
      eventType: input.eventType,
      stepMode: input.stepMode,
      escalateAfterMins: input.escalateAfterMins ?? null,
      status: "ACTIVE",
      createdBy: userId,
    },
  });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "approval_policy.created",
    entityType: "ApprovalPolicy",
    entityId: policy.id,
    metadata: { name: policy.name, module: policy.module, eventType: policy.eventType },
  });

  revalidatePath("/app/flow/policies");
  return { success: true, data: { id: policy.id } };
}

export async function updateApprovalPolicy(
  policyId: string,
  input: {
    name?: string;
    module?: string;
    eventType?: string;
    stepMode?: "SINGLE" | "SEQUENTIAL";
    escalateAfterMins?: number | null;
  }
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const existing = await db.approvalPolicy.findFirst({ where: { id: policyId, orgId } });
  if (!existing) return { success: false, error: "Policy not found" };

  if (input.name !== undefined && !input.name.trim()) {
    return { success: false, error: "Policy name is required" };
  }
  if (input.module !== undefined && !VALID_MODULES.includes(input.module as never)) {
    return { success: false, error: `Invalid module. Must be one of: ${VALID_MODULES.join(", ")}` };
  }

  await db.approvalPolicy.update({
    where: { id: policyId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.module !== undefined && { module: input.module }),
      ...(input.eventType !== undefined && { eventType: input.eventType }),
      ...(input.stepMode !== undefined && { stepMode: input.stepMode }),
      ...(input.escalateAfterMins !== undefined && { escalateAfterMins: input.escalateAfterMins }),
    },
  });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "approval_policy.updated",
    entityType: "ApprovalPolicy",
    entityId: policyId,
    metadata: { changes: input },
  });

  revalidatePath("/app/flow/policies");
  revalidatePath(`/app/flow/policies/${policyId}`);
  return { success: true, data: undefined };
}

export async function toggleApprovalPolicyStatus(
  policyId: string
): Promise<ActionResult<{ newStatus: string }>> {
  const { orgId, userId } = await requireRole("admin");

  const policy = await db.approvalPolicy.findFirst({ where: { id: policyId, orgId } });
  if (!policy) return { success: false, error: "Policy not found" };

  const newStatus = policy.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  await db.approvalPolicy.update({
    where: { id: policyId },
    data: { status: newStatus },
  });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "approval_policy.status_toggled",
    entityType: "ApprovalPolicy",
    entityId: policyId,
    metadata: { oldStatus: policy.status, newStatus },
  });

  revalidatePath("/app/flow/policies");
  revalidatePath(`/app/flow/policies/${policyId}`);
  return { success: true, data: { newStatus } };
}

export async function addApprovalPolicyRule(
  policyId: string,
  rule: {
    minAmount?: number;
    maxAmount?: number;
    approverRole?: string;
    approverUserId?: string;
    fallbackRole?: string;
    fallbackUserId?: string;
  }
): Promise<ActionResult<{ id: string }>> {
  const { orgId, userId } = await requireRole("admin");

  const policy = await db.approvalPolicy.findFirst({ where: { id: policyId, orgId } });
  if (!policy) return { success: false, error: "Policy not found" };

  if (!rule.approverRole && !rule.approverUserId) {
    return { success: false, error: "At least one of approverRole or approverUserId is required" };
  }
  if (rule.minAmount !== undefined && rule.maxAmount !== undefined && rule.minAmount >= rule.maxAmount) {
    return { success: false, error: "minAmount must be less than maxAmount" };
  }

  const maxSequenceResult = await db.approvalPolicyRule.aggregate({
    where: { policyId },
    _max: { sequence: true },
  });
  const nextSequence = (maxSequenceResult._max.sequence ?? 0) + 1;

  const newRule = await db.approvalPolicyRule.create({
    data: {
      policyId,
      sequence: nextSequence,
      minAmount: rule.minAmount ?? null,
      maxAmount: rule.maxAmount ?? null,
      approverRole: rule.approverRole ?? null,
      approverUserId: rule.approverUserId ?? null,
      fallbackRole: rule.fallbackRole ?? null,
      fallbackUserId: rule.fallbackUserId ?? null,
    },
  });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "approval_policy_rule.added",
    entityType: "ApprovalPolicyRule",
    entityId: newRule.id,
    metadata: { policyId, sequence: nextSequence },
  });

  revalidatePath("/app/flow/policies");
  revalidatePath(`/app/flow/policies/${policyId}`);
  return { success: true, data: { id: newRule.id } };
}

export async function updateApprovalPolicyRule(
  ruleId: string,
  input: {
    minAmount?: number | null;
    maxAmount?: number | null;
    approverRole?: string | null;
    approverUserId?: string | null;
    fallbackRole?: string | null;
    fallbackUserId?: string | null;
  }
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const rule = await db.approvalPolicyRule.findFirst({ where: { id: ruleId } });
  if (!rule) return { success: false, error: "Rule not found" };

  const policy = await db.approvalPolicy.findFirst({ where: { id: rule.policyId, orgId } });
  if (!policy) return { success: false, error: "Rule not found" };

  const approverRole = input.approverRole !== undefined ? input.approverRole : rule.approverRole;
  const approverUserId = input.approverUserId !== undefined ? input.approverUserId : rule.approverUserId;
  if (!approverRole && !approverUserId) {
    return { success: false, error: "At least one of approverRole or approverUserId is required" };
  }

  const min = input.minAmount !== undefined ? input.minAmount : (rule.minAmount ? Number(rule.minAmount) : undefined);
  const max = input.maxAmount !== undefined ? input.maxAmount : (rule.maxAmount ? Number(rule.maxAmount) : undefined);
  if (min !== undefined && min !== null && max !== undefined && max !== null && min >= max) {
    return { success: false, error: "minAmount must be less than maxAmount" };
  }

  await db.approvalPolicyRule.update({
    where: { id: ruleId },
    data: {
      ...(input.minAmount !== undefined && { minAmount: input.minAmount }),
      ...(input.maxAmount !== undefined && { maxAmount: input.maxAmount }),
      ...(input.approverRole !== undefined && { approverRole: input.approverRole }),
      ...(input.approverUserId !== undefined && { approverUserId: input.approverUserId }),
      ...(input.fallbackRole !== undefined && { fallbackRole: input.fallbackRole }),
      ...(input.fallbackUserId !== undefined && { fallbackUserId: input.fallbackUserId }),
    },
  });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "approval_policy_rule.updated",
    entityType: "ApprovalPolicyRule",
    entityId: ruleId,
    metadata: { policyId: rule.policyId },
  });

  revalidatePath(`/app/flow/policies/${policy.id}`);
  return { success: true, data: undefined };
}

export async function removeApprovalPolicyRule(ruleId: string): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const rule = await db.approvalPolicyRule.findFirst({ where: { id: ruleId } });
  if (!rule) return { success: false, error: "Rule not found" };

  const policy = await db.approvalPolicy.findFirst({ where: { id: rule.policyId, orgId } });
  if (!policy) return { success: false, error: "Rule not found" };

  await db.approvalPolicyRule.delete({ where: { id: ruleId } });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "approval_policy_rule.removed",
    entityType: "ApprovalPolicyRule",
    entityId: ruleId,
    metadata: { policyId: rule.policyId },
  });

  revalidatePath(`/app/flow/policies/${policy.id}`);
  return { success: true, data: undefined };
}

export async function reorderApprovalPolicyRules(
  policyId: string,
  ruleIds: string[]
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const policy = await db.approvalPolicy.findFirst({ where: { id: policyId, orgId } });
  if (!policy) return { success: false, error: "Policy not found" };

  await db.$transaction(
    ruleIds.map((id, index) =>
      db.approvalPolicyRule.update({
        where: { id },
        data: { sequence: index + 1 },
      })
    )
  );

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "approval_policy_rules.reordered",
    entityType: "ApprovalPolicy",
    entityId: policyId,
    metadata: { ruleIds },
  });

  revalidatePath(`/app/flow/policies/${policyId}`);
  return { success: true, data: undefined };
}
