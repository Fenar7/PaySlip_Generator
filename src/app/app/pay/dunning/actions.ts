"use server";

import { requireOrgContext, requireRole } from "@/lib/auth";
import { requirePlan, getOrgPlan } from "@/lib/plans/enforcement";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DunningTone } from "@/generated/prisma/client";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const VALID_TONES = ["FRIENDLY", "POLITE", "FIRM", "URGENT", "ESCALATE"] as const;
const VALID_CHANNELS = ["email", "sms"] as const;
const DUNNING_PATH = "/app/pay/dunning";

// ─── 1. List Dunning Sequences ───────────────────────────────────────────────

export async function listDunningSequences(): Promise<
  ActionResult<
    Array<{
      id: string;
      name: string;
      isDefault: boolean;
      isActive: boolean;
      stepsCount: number;
      createdAt: Date;
      updatedAt: Date;
    }>
  >
> {
  try {
    const { orgId } = await requireOrgContext();
    await requirePlan(orgId, "free");

    const sequences = await db.dunningSequence.findMany({
      where: { orgId },
      include: { _count: { select: { steps: true } } },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: sequences.map((s) => ({
        id: s.id,
        name: s.name,
        isDefault: s.isDefault,
        isActive: s.isActive,
        stepsCount: s._count.steps,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
  } catch (error) {
    console.error("listDunningSequences error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to list sequences" };
  }
}

// ─── 2. Get Dunning Sequence ─────────────────────────────────────────────────

export async function getDunningSequence(
  sequenceId: string
): Promise<
  ActionResult<{
    id: string;
    name: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    steps: Array<{
      id: string;
      stepNumber: number;
      daysOffset: number;
      channels: string[];
      emailSubject: string;
      emailBody: string;
      smsBody: string | null;
      smsTemplateId: string | null;
      tone: string;
      createTicket: boolean;
    }>;
  }>
> {
  try {
    const { orgId } = await requireOrgContext();

    const sequence = await db.dunningSequence.findUnique({
      where: { id: sequenceId },
      include: {
        steps: { orderBy: { stepNumber: "asc" } },
      },
    });

    if (!sequence || sequence.orgId !== orgId) {
      return { success: false, error: "Sequence not found" };
    }

    return {
      success: true,
      data: {
        id: sequence.id,
        name: sequence.name,
        isDefault: sequence.isDefault,
        isActive: sequence.isActive,
        createdAt: sequence.createdAt,
        updatedAt: sequence.updatedAt,
        steps: sequence.steps.map((st) => ({
          id: st.id,
          stepNumber: st.stepNumber,
          daysOffset: st.daysOffset,
          channels: st.channels,
          emailSubject: st.emailSubject,
          emailBody: st.emailBody,
          smsBody: st.smsBody,
          smsTemplateId: st.smsTemplateId,
          tone: st.tone,
          createTicket: st.createTicket,
        })),
      },
    };
  } catch (error) {
    console.error("getDunningSequence error:", error);
    return { success: false, error: "Failed to load sequence" };
  }
}

// ─── 3. Create Dunning Sequence ──────────────────────────────────────────────

export async function createDunningSequence(
  dataOrFormData: { name: string; isDefault?: boolean } | FormData
): Promise<ActionResult<{ id: string; name: string; isDefault: boolean }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    // Support both FormData (form action) and typed object (programmatic)
    let rawName: string;
    let isDefault: boolean;
    if (dataOrFormData instanceof FormData) {
      rawName = (dataOrFormData.get("name") as string) ?? "";
      isDefault = dataOrFormData.get("isDefault") === "on";
    } else {
      rawName = dataOrFormData.name;
      isDefault = dataOrFormData.isDefault ?? false;
    }

    // Check plan limit (count-based, not monthly usage)
    const orgPlan = await getOrgPlan(orgId);
    const currentCount = await db.dunningSequence.count({ where: { orgId } });
    if (currentCount >= orgPlan.limits.dunningSequences) {
      return {
        success: false,
        error: `Dunning sequence limit reached (${currentCount}/${orgPlan.limits.dunningSequences}). Upgrade your plan for more.`,
      };
    }

    // Validate name
    const name = rawName?.trim();
    if (!name || name.length === 0) {
      return { success: false, error: "Name is required" };
    }
    if (name.length > 100) {
      return { success: false, error: "Name must be 100 characters or less" };
    }

    // If setting as default, unset any existing default
    if (isDefault) {
      await db.dunningSequence.updateMany({
        where: { orgId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const sequence = await db.dunningSequence.create({
      data: {
        orgId,
        name,
        isDefault,
      },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "dunning_sequence_created",
      entityType: "DunningSequence",
      entityId: sequence.id,
      metadata: { name: sequence.name, isDefault: sequence.isDefault },
    });

    revalidatePath(DUNNING_PATH);

    // When called as a form action, redirect to the new sequence page
    if (dataOrFormData instanceof FormData) {
      redirect(`/app/pay/dunning/sequences/${sequence.id}`);
    }

    return {
      success: true,
      data: { id: sequence.id, name: sequence.name, isDefault: sequence.isDefault },
    };
  } catch (error) {
    console.error("createDunningSequence error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create sequence" };
  }
}

// ─── 4. Update Dunning Sequence ──────────────────────────────────────────────

export async function updateDunningSequence(
  sequenceId: string,
  data: { name?: string; isDefault?: boolean; isActive?: boolean }
): Promise<ActionResult<{ id: string; name: string; isDefault: boolean; isActive: boolean }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const existing = await db.dunningSequence.findUnique({ where: { id: sequenceId } });
    if (!existing || existing.orgId !== orgId) {
      return { success: false, error: "Sequence not found" };
    }

    // Validate name if provided
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name || name.length === 0) {
        return { success: false, error: "Name is required" };
      }
      if (name.length > 100) {
        return { success: false, error: "Name must be 100 characters or less" };
      }
      data.name = name;
    }

    // If setting as default, unset existing default
    if (data.isDefault === true) {
      await db.dunningSequence.updateMany({
        where: { orgId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await db.dunningSequence.update({
      where: { id: sequenceId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "dunning_sequence_updated",
      entityType: "DunningSequence",
      entityId: sequenceId,
      metadata: data,
    });

    revalidatePath(DUNNING_PATH);

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        isDefault: updated.isDefault,
        isActive: updated.isActive,
      },
    };
  } catch (error) {
    console.error("updateDunningSequence error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update sequence" };
  }
}

// ─── 5. Delete Dunning Sequence ──────────────────────────────────────────────

export async function deleteDunningSequence(
  sequenceId: string
): Promise<ActionResult<{ deleted: true }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const existing = await db.dunningSequence.findUnique({ where: { id: sequenceId } });
    if (!existing || existing.orgId !== orgId) {
      return { success: false, error: "Sequence not found" };
    }

    // Check if any invoice references this sequence
    const usedByInvoice = await db.invoice.findFirst({
      where: { organizationId: orgId, dunningSequenceId: sequenceId },
      select: { id: true },
    });
    if (usedByInvoice) {
      return {
        success: false,
        error: "Cannot delete: this sequence is assigned to one or more invoices. Reassign them first.",
      };
    }

    await db.dunningSequence.delete({ where: { id: sequenceId } });

    await logAudit({
      orgId,
      actorId: userId,
      action: "dunning_sequence_deleted",
      entityType: "DunningSequence",
      entityId: sequenceId,
      metadata: { name: existing.name },
    });

    revalidatePath(DUNNING_PATH);

    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error("deleteDunningSequence error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete sequence" };
  }
}

// ─── 6. Add Dunning Step ─────────────────────────────────────────────────────

export async function addDunningStep(
  sequenceId: string,
  data: {
    stepNumber: number;
    daysOffset: number;
    channels: string[];
    emailSubject: string;
    emailBody: string;
    smsBody?: string;
    smsTemplateId?: string;
    tone: string;
    createTicket?: boolean;
  }
): Promise<ActionResult<{ id: string; stepNumber: number }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const sequence = await db.dunningSequence.findUnique({
      where: { id: sequenceId },
      include: { _count: { select: { steps: true } } },
    });
    if (!sequence || sequence.orgId !== orgId) {
      return { success: false, error: "Sequence not found" };
    }

    // Check plan limit for steps per sequence
    const orgPlan = await getOrgPlan(orgId);
    if (sequence._count.steps >= orgPlan.limits.dunningStepsPerSequence) {
      return {
        success: false,
        error: `Step limit reached (${sequence._count.steps}/${orgPlan.limits.dunningStepsPerSequence}). Upgrade your plan for more.`,
      };
    }

    // Validate fields
    if (data.daysOffset < 0) {
      return { success: false, error: "daysOffset must be 0 or greater" };
    }
    if (!data.channels.length || !data.channels.every((c) => (VALID_CHANNELS as readonly string[]).includes(c))) {
      return { success: false, error: `channels must be a non-empty subset of ${VALID_CHANNELS.join(", ")}` };
    }
    if (!data.emailSubject?.trim()) {
      return { success: false, error: "emailSubject is required" };
    }
    if (data.emailSubject.trim().length > 200) {
      return { success: false, error: "emailSubject must be 200 characters or less" };
    }
    if (!data.emailBody?.trim()) {
      return { success: false, error: "emailBody is required" };
    }
    if (!(VALID_TONES as readonly string[]).includes(data.tone)) {
      return { success: false, error: `tone must be one of: ${VALID_TONES.join(", ")}` };
    }

    // Check SMS channel with plan
    if (data.channels.includes("sms") && !orgPlan.limits.smsReminders) {
      return { success: false, error: "SMS reminders require the Pro plan or higher" };
    }

    // Handle stepNumber conflict: shift existing steps at or above the target number
    const conflicting = await db.dunningStep.findUnique({
      where: { sequenceId_stepNumber: { sequenceId, stepNumber: data.stepNumber } },
    });
    if (conflicting) {
      await db.dunningStep.updateMany({
        where: { sequenceId, stepNumber: { gte: data.stepNumber } },
        data: { stepNumber: { increment: 1 } },
      });
    }

    const step = await db.dunningStep.create({
      data: {
        sequenceId,
        stepNumber: data.stepNumber,
        daysOffset: data.daysOffset,
        channels: data.channels,
        emailSubject: data.emailSubject.trim(),
        emailBody: data.emailBody.trim(),
        smsBody: data.smsBody?.trim() || null,
        smsTemplateId: data.smsTemplateId || null,
        tone: data.tone as "FRIENDLY" | "POLITE" | "FIRM" | "URGENT" | "ESCALATE",
        createTicket: data.createTicket ?? false,
      },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "dunning_step_created",
      entityType: "DunningStep",
      entityId: step.id,
      metadata: { sequenceId, stepNumber: step.stepNumber, tone: step.tone },
    });

    revalidatePath(DUNNING_PATH);

    return { success: true, data: { id: step.id, stepNumber: step.stepNumber } };
  } catch (error) {
    console.error("addDunningStep error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to add step" };
  }
}

// ─── 7. Update Dunning Step ─────────────────────────────────────────────────

export async function updateDunningStep(
  stepId: string,
  data: {
    stepNumber?: number;
    daysOffset?: number;
    channels?: string[];
    emailSubject?: string;
    emailBody?: string;
    smsBody?: string;
    smsTemplateId?: string;
    tone?: string;
    createTicket?: boolean;
  }
): Promise<ActionResult<{ id: string; stepNumber: number }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const step = await db.dunningStep.findUnique({
      where: { id: stepId },
      include: { sequence: true },
    });
    if (!step || step.sequence.orgId !== orgId) {
      return { success: false, error: "Step not found" };
    }

    // Validate fields if provided
    if (data.daysOffset !== undefined && data.daysOffset < 0) {
      return { success: false, error: "daysOffset must be 0 or greater" };
    }
    if (data.channels !== undefined) {
      if (!data.channels.length || !data.channels.every((c) => (VALID_CHANNELS as readonly string[]).includes(c))) {
        return { success: false, error: `channels must be a non-empty subset of ${VALID_CHANNELS.join(", ")}` };
      }
      const orgPlan = await getOrgPlan(orgId);
      if (data.channels.includes("sms") && !orgPlan.limits.smsReminders) {
        return { success: false, error: "SMS reminders require the Pro plan or higher" };
      }
    }
    if (data.emailSubject !== undefined) {
      if (!data.emailSubject.trim()) {
        return { success: false, error: "emailSubject is required" };
      }
      if (data.emailSubject.trim().length > 200) {
        return { success: false, error: "emailSubject must be 200 characters or less" };
      }
    }
    if (data.emailBody !== undefined && !data.emailBody.trim()) {
      return { success: false, error: "emailBody is required" };
    }
    if (data.tone !== undefined && !(VALID_TONES as readonly string[]).includes(data.tone)) {
      return { success: false, error: `tone must be one of: ${VALID_TONES.join(", ")}` };
    }

    const updated = await db.dunningStep.update({
      where: { id: stepId },
      data: {
        ...(data.stepNumber !== undefined && { stepNumber: data.stepNumber }),
        ...(data.daysOffset !== undefined && { daysOffset: data.daysOffset }),
        ...(data.channels !== undefined && { channels: data.channels }),
        ...(data.emailSubject !== undefined && { emailSubject: data.emailSubject.trim() }),
        ...(data.emailBody !== undefined && { emailBody: data.emailBody.trim() }),
        ...(data.smsBody !== undefined && { smsBody: data.smsBody?.trim() || null }),
        ...(data.smsTemplateId !== undefined && { smsTemplateId: data.smsTemplateId || null }),
        ...(data.tone !== undefined && { tone: data.tone as "FRIENDLY" | "POLITE" | "FIRM" | "URGENT" | "ESCALATE" }),
        ...(data.createTicket !== undefined && { createTicket: data.createTicket }),
      },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "dunning_step_updated",
      entityType: "DunningStep",
      entityId: stepId,
      metadata: { sequenceId: step.sequenceId, ...data },
    });

    revalidatePath(DUNNING_PATH);

    return { success: true, data: { id: updated.id, stepNumber: updated.stepNumber } };
  } catch (error) {
    console.error("updateDunningStep error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update step" };
  }
}

// ─── 8. Delete Dunning Step ──────────────────────────────────────────────────

export async function deleteDunningStep(
  stepId: string,
  _sequenceId?: string
): Promise<ActionResult<{ deleted: true }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const step = await db.dunningStep.findUnique({
      where: { id: stepId },
      include: { sequence: true },
    });
    if (!step || step.sequence.orgId !== orgId) {
      return { success: false, error: "Step not found" };
    }

    await db.dunningStep.delete({ where: { id: stepId } });

    await logAudit({
      orgId,
      actorId: userId,
      action: "dunning_step_deleted",
      entityType: "DunningStep",
      entityId: stepId,
      metadata: { sequenceId: step.sequenceId, stepNumber: step.stepNumber },
    });

    revalidatePath(DUNNING_PATH);

    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error("deleteDunningStep error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete step" };
  }
}

// ─── 9. Send Dunning Manually ────────────────────────────────────────────────

export async function sendDunningManually(
  invoiceId: string
): Promise<ActionResult<{ logId: string; stepNumber: number; channel: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });
    if (!invoice || invoice.organizationId !== orgId) {
      return { success: false, error: "Invoice not found" };
    }

    const validStatuses = ["OVERDUE", "ISSUED", "PARTIALLY_PAID"];
    if (!validStatuses.includes(invoice.status)) {
      return { success: false, error: `Cannot send dunning for invoice with status "${invoice.status}"` };
    }

    if (!invoice.dunningEnabled) {
      return { success: false, error: "Dunning is disabled for this invoice" };
    }

    if (invoice.dunningPausedUntil && new Date(invoice.dunningPausedUntil) > new Date()) {
      return { success: false, error: "Dunning is paused for this invoice" };
    }

    // Check customer opt-out
    if (invoice.customerId) {
      const optOut = await db.dunningOptOut.findUnique({
        where: { orgId_customerId: { orgId, customerId: invoice.customerId } },
      });
      if (optOut) {
        return { success: false, error: "Customer has opted out of dunning reminders" };
      }
    }

    // Get dunning sequence: invoice-specific or org default
    const sequenceId =
      invoice.dunningSequenceId ??
      (
        await db.dunningSequence.findFirst({
          where: { orgId, isDefault: true, isActive: true },
          select: { id: true },
        })
      )?.id;

    if (!sequenceId) {
      return { success: false, error: "No dunning sequence configured. Create a default sequence first." };
    }

    // Find the next unfired step
    const firedSteps = await db.dunningLog.findMany({
      where: { invoiceId, sequenceId, status: "SENT" },
      select: { stepNumber: true },
    });
    const firedNumbers = new Set(firedSteps.map((l) => l.stepNumber));

    const nextStep = await db.dunningStep.findFirst({
      where: {
        sequenceId,
        stepNumber: { notIn: [...firedNumbers] },
      },
      orderBy: { stepNumber: "asc" },
    });

    if (!nextStep) {
      return { success: false, error: "All dunning steps have already been sent for this invoice" };
    }

    // Create dunning log entry
    const channel = nextStep.channels[0] ?? "email";
    const log = await db.dunningLog.create({
      data: {
        orgId,
        invoiceId,
        sequenceId,
        stepNumber: nextStep.stepNumber,
        channel,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "dunning_manual_send",
      entityType: "Invoice",
      entityId: invoiceId,
      metadata: {
        sequenceId,
        stepNumber: nextStep.stepNumber,
        channel,
        logId: log.id,
      },
    });

    revalidatePath(DUNNING_PATH);

    return {
      success: true,
      data: { logId: log.id, stepNumber: nextStep.stepNumber, channel },
    };
  } catch (error) {
    console.error("sendDunningManually error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to send dunning" };
  }
}

// ─── 10. Get Dunning Logs ────────────────────────────────────────────────────

export async function getDunningLogs(invoiceId?: string): Promise<
  ActionResult<
    Array<{
      id: string;
      invoiceId: string;
      invoiceNumber: string;
      customerName: string;
      sequenceId: string;
      stepNumber: number;
      channel: string;
      status: string;
      errorMessage: string | null;
      sentAt: Date | null;
      createdAt: Date;
    }>
  >
> {
  try {
    const { orgId } = await requireOrgContext();

    if (invoiceId) {
      // Verify org ownership
      const invoice = await db.invoice.findFirst({
        where: { id: invoiceId, organizationId: orgId },
        select: { id: true },
      });
      if (!invoice) {
        return { success: false, error: "Invoice not found" };
      }
    }

    const logs = await db.dunningLog.findMany({
      where: {
        orgId,
        ...(invoiceId && { invoiceId }),
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            customer: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return {
      success: true,
      data: logs.map((l) => ({
        id: l.id,
        invoiceId: l.invoiceId,
        invoiceNumber: l.invoice.invoiceNumber,
        customerName: l.invoice.customer?.name ?? "—",
        sequenceId: l.sequenceId,
        stepNumber: l.stepNumber,
        channel: l.channel,
        status: l.status,
        errorMessage: l.errorMessage,
        sentAt: l.sentAt,
        createdAt: l.createdAt,
      })),
    };
  } catch (error) {
    console.error("getDunningLogs error:", error);
    return { success: false, error: "Failed to load dunning logs" };
  }
}

// ─── 11. Get Dunning Opt-Outs ────────────────────────────────────────────────

export async function getDunningOptOuts(): Promise<
  ActionResult<
    Array<{
      id: string;
      customerId: string;
      customerName: string;
      optedOutAt: Date;
    }>
  >
> {
  try {
    const { orgId } = await requireOrgContext();

    const optOuts = await db.dunningOptOut.findMany({
      where: { orgId },
      include: { customer: { select: { name: true } } },
      orderBy: { optedOutAt: "desc" },
    });

    return {
      success: true,
      data: optOuts.map((o) => ({
        id: o.id,
        customerId: o.customerId,
        customerName: o.customer.name,
        optedOutAt: o.optedOutAt,
      })),
    };
  } catch (error) {
    console.error("getDunningOptOuts error:", error);
    return { success: false, error: "Failed to load opt-outs" };
  }
}

// ─── 12. Toggle Invoice Dunning ──────────────────────────────────────────────

export async function toggleInvoiceDunning(
  invoiceId: string,
  enabled: boolean
): Promise<ActionResult<{ dunningEnabled: boolean }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      select: { id: true },
    });
    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: { dunningEnabled: enabled },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "dunning_invoice_toggled",
      entityType: "Invoice",
      entityId: invoiceId,
      metadata: { dunningEnabled: enabled },
    });

    revalidatePath(DUNNING_PATH);

    return { success: true, data: { dunningEnabled: enabled } };
  } catch (error) {
    console.error("toggleInvoiceDunning error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to toggle dunning" };
  }
}

// ─── 13. Pause Invoice Dunning ───────────────────────────────────────────────

export async function pauseInvoiceDunning(
  invoiceId: string,
  until?: string
): Promise<ActionResult<{ dunningPausedUntil: Date | null }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      select: { id: true },
    });
    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    const pausedUntil = until ? new Date(until) : null;

    if (pausedUntil && isNaN(pausedUntil.getTime())) {
      return { success: false, error: "Invalid date format for 'until'" };
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: { dunningPausedUntil: pausedUntil },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "dunning_invoice_paused",
      entityType: "Invoice",
      entityId: invoiceId,
      metadata: { dunningPausedUntil: pausedUntil?.toISOString() ?? null },
    });

    revalidatePath(DUNNING_PATH);

    return { success: true, data: { dunningPausedUntil: pausedUntil } };
  } catch (error) {
    console.error("pauseInvoiceDunning error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to pause dunning" };
  }
}

