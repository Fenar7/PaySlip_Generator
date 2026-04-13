"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logFlowConfigChange } from "@/lib/flow/audit";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createSlaPolicy(input: {
  name: string;
  category?: string;
  priority?: string;
  firstResponseTargetMins: number;
  resolutionTargetMins: number;
  businessHoursOnly?: boolean;
  isDefault?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  const { orgId, userId } = await requireRole("admin");

  if (!input.name?.trim()) {
    return { success: false, error: "Policy name is required" };
  }
  if (input.firstResponseTargetMins <= 0) {
    return { success: false, error: "First response target must be greater than 0" };
  }
  if (input.resolutionTargetMins <= 0) {
    return { success: false, error: "Resolution target must be greater than 0" };
  }

  if (input.isDefault) {
    await db.ticketSlaPolicy.updateMany({
      where: { orgId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const policy = await db.ticketSlaPolicy.create({
    data: {
      orgId,
      name: input.name.trim(),
      category: input.category ?? null,
      priority: input.priority ?? null,
      firstResponseTargetMins: input.firstResponseTargetMins,
      resolutionTargetMins: input.resolutionTargetMins,
      businessHoursOnly: input.businessHoursOnly ?? false,
      isDefault: input.isDefault ?? false,
    },
  });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "sla_policy.created",
    entityType: "TicketSlaPolicy",
    entityId: policy.id,
    metadata: { name: policy.name, isDefault: policy.isDefault },
  });

  revalidatePath("/app/flow/sla");
  return { success: true, data: { id: policy.id } };
}

export async function updateSlaPolicy(
  policyId: string,
  input: {
    name?: string;
    category?: string | null;
    priority?: string | null;
    firstResponseTargetMins?: number;
    resolutionTargetMins?: number;
    businessHoursOnly?: boolean;
    isDefault?: boolean;
  }
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const existing = await db.ticketSlaPolicy.findFirst({ where: { id: policyId, orgId } });
  if (!existing) return { success: false, error: "SLA policy not found" };

  if (input.name !== undefined && !input.name.trim()) {
    return { success: false, error: "Policy name is required" };
  }
  if (input.firstResponseTargetMins !== undefined && input.firstResponseTargetMins <= 0) {
    return { success: false, error: "First response target must be greater than 0" };
  }
  if (input.resolutionTargetMins !== undefined && input.resolutionTargetMins <= 0) {
    return { success: false, error: "Resolution target must be greater than 0" };
  }

  if (input.isDefault === true && !existing.isDefault) {
    await db.ticketSlaPolicy.updateMany({
      where: { orgId, isDefault: true },
      data: { isDefault: false },
    });
  }

  await db.ticketSlaPolicy.update({
    where: { id: policyId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.firstResponseTargetMins !== undefined && {
        firstResponseTargetMins: input.firstResponseTargetMins,
      }),
      ...(input.resolutionTargetMins !== undefined && {
        resolutionTargetMins: input.resolutionTargetMins,
      }),
      ...(input.businessHoursOnly !== undefined && { businessHoursOnly: input.businessHoursOnly }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
    },
  });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "sla_policy.updated",
    entityType: "TicketSlaPolicy",
    entityId: policyId,
    metadata: { changes: input },
  });

  revalidatePath("/app/flow/sla");
  revalidatePath(`/app/flow/sla/${policyId}`);
  return { success: true, data: undefined };
}

export async function setDefaultSlaPolicy(policyId: string): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const policy = await db.ticketSlaPolicy.findFirst({ where: { id: policyId, orgId } });
  if (!policy) return { success: false, error: "SLA policy not found" };

  await db.$transaction([
    db.ticketSlaPolicy.updateMany({
      where: { orgId, isDefault: true },
      data: { isDefault: false },
    }),
    db.ticketSlaPolicy.update({
      where: { id: policyId },
      data: { isDefault: true },
    }),
  ]);

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "sla_policy.set_default",
    entityType: "TicketSlaPolicy",
    entityId: policyId,
    metadata: { name: policy.name },
  });

  revalidatePath("/app/flow/sla");
  revalidatePath(`/app/flow/sla/${policyId}`);
  return { success: true, data: undefined };
}

export async function deleteSlaPolicy(policyId: string): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const policy = await db.ticketSlaPolicy.findFirst({ where: { id: policyId, orgId } });
  if (!policy) return { success: false, error: "SLA policy not found" };

  if (policy.isDefault) {
    const totalCount = await db.ticketSlaPolicy.count({ where: { orgId } });
    if (totalCount === 1) {
      return {
        success: false,
        error: "Cannot delete the only default SLA policy. Create another policy first.",
      };
    }
  }

  await db.ticketSlaPolicy.delete({ where: { id: policyId } });

  await logFlowConfigChange({
    orgId,
    actorId: userId,
    action: "sla_policy.deleted",
    entityType: "TicketSlaPolicy",
    entityId: policyId,
    metadata: { name: policy.name, wasDefault: policy.isDefault },
  });

  revalidatePath("/app/flow/sla");
  return { success: true, data: undefined };
}
