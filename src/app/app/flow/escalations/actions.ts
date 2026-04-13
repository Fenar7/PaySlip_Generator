"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logFlowConfigChange } from "@/lib/flow/audit";
import { SUPPORTED_BREACH_TYPES, type SupportedBreachType } from "./catalog";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type EscalationRuleInput = {
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

export async function createEscalationRule(
  input: EscalationRuleInput
): Promise<ActionResult<{ id: string }>> {
  const { orgId, userId } = await requireRole("admin");

  const validationError = validateEscalationInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const rule = await db.ticketEscalationRule.create({
    data: {
      orgId,
      name: input.name,
      breachType: input.breachType,
      afterMins: input.afterMins,
      targetRole: input.targetRole,
      targetUserId: input.targetUserId,
      notifyOrgAdmins: input.notifyOrgAdmins ?? false,
      enabled: true,
    },
  });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "escalation_rule.created",
    entityType: "TicketEscalationRule",
    entityId: rule.id,
    metadata: { name: rule.name, breachType: rule.breachType },
  });

  revalidatePath("/app/flow/escalations");
  return { success: true, data: { id: rule.id } };
}

export async function updateEscalationRule(
  ruleId: string,
  input: EscalationRuleInput
): Promise<ActionResult<{ id: string }>> {
  const { orgId, userId } = await requireRole("admin");

  const existing = await db.ticketEscalationRule.findFirst({
    where: { id: ruleId, orgId },
  });

  if (!existing) {
    return { success: false, error: "Escalation rule not found" };
  }

  const validationError = validateEscalationInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const updated = await db.ticketEscalationRule.update({
    where: { id: ruleId },
    data: {
      name: input.name,
      breachType: input.breachType,
      afterMins: input.afterMins,
      targetRole: input.targetRole,
      targetUserId: input.targetUserId,
      notifyOrgAdmins: input.notifyOrgAdmins ?? false,
    },
  });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "escalation_rule.updated",
    entityType: "TicketEscalationRule",
    entityId: updated.id,
    metadata: { name: updated.name, breachType: updated.breachType },
  });

  revalidatePath("/app/flow/escalations");
  return { success: true, data: { id: updated.id } };
}

export async function deleteEscalationRule(
  ruleId: string
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const existing = await db.ticketEscalationRule.findFirst({
    where: { id: ruleId, orgId },
  });

  if (!existing) {
    return { success: false, error: "Escalation rule not found" };
  }

  await db.ticketEscalationRule.delete({ where: { id: ruleId } });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "escalation_rule.deleted",
    entityType: "TicketEscalationRule",
    entityId: ruleId,
    metadata: { name: existing.name },
  });

  revalidatePath("/app/flow/escalations");
  return { success: true, data: undefined };
}

export async function toggleEscalationRule(
  ruleId: string
): Promise<ActionResult<{ enabled: boolean }>> {
  const { orgId, userId } = await requireRole("admin");

  const existing = await db.ticketEscalationRule.findFirst({
    where: { id: ruleId, orgId },
  });

  if (!existing) {
    return { success: false, error: "Escalation rule not found" };
  }

  const newEnabled = !existing.enabled;

  const updated = await db.ticketEscalationRule.update({
    where: { id: ruleId },
    data: { enabled: newEnabled },
  });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "escalation_rule.toggled",
    entityType: "TicketEscalationRule",
    entityId: ruleId,
    metadata: { previousEnabled: existing.enabled, newEnabled: updated.enabled },
  });

  revalidatePath("/app/flow/escalations");
  return { success: true, data: { enabled: updated.enabled } };
}
