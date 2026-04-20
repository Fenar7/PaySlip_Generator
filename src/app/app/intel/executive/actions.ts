"use server";

import { requireOrgContext, requireRole } from "@/lib/auth";
import { requireFeature } from "@/lib/plans/enforcement";
import { computeExecutiveKpis } from "@/lib/intel/kpi-service";
import {
  generateFlashReport,
  deliverFlashReport,
} from "@/lib/intel/flash-reports";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { logAudit } from "@/lib/audit";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── KPI Actions ────────────────────────────────────────────────────────────

export async function getExecutiveKpisAction(
  period: "MTD" | "QTD" | "YTD" = "MTD"
): Promise<ActionResult<Awaited<ReturnType<typeof computeExecutiveKpis>>>> {
  try {
    const { orgId } = await requireOrgContext();
    await requireFeature(orgId, "executiveHub");
    const snapshot = await computeExecutiveKpis(orgId, period);

    // Cache the result
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min TTL
    await db.executiveKpiCache.upsert({
      where: { orgId_period: { orgId, period } },
      create: {
        orgId,
        period,
        kpis: snapshot.kpis as unknown as Prisma.InputJsonValue,
        expiresAt,
      },
      update: {
        kpis: snapshot.kpis as unknown as Prisma.InputJsonValue,
        computedAt: new Date(),
        expiresAt,
      },
    });

    return { success: true, data: snapshot };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to compute KPIs",
    };
  }
}

// ─── Flash Report Actions ───────────────────────────────────────────────────

export async function generateFlashReportAction(
  period: "MTD" | "QTD" | "YTD" = "MTD"
): Promise<ActionResult<Awaited<ReturnType<typeof generateFlashReport>>>> {
  try {
    const { orgId } = await requireOrgContext();
    await requireFeature(orgId, "executiveHub");
    await requireFeature(orgId, "flashReports");
    const report = await generateFlashReport(orgId, period);
    return { success: true, data: report };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to generate flash report",
    };
  }
}

export async function sendFlashReportNowAction(
  scheduleId: string,
  period: "MTD" | "QTD" | "YTD" = "MTD"
): Promise<ActionResult<{ delivered: boolean }>> {
  try {
    const { orgId, userId } = await requireRole("admin");
    await requireFeature(orgId, "executiveHub");
    await requireFeature(orgId, "flashReports");

    const schedule = await db.flashReportSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule || schedule.orgId !== orgId) {
      return { success: false, error: "Schedule not found" };
    }

    const result = await deliverFlashReport(
      scheduleId,
      orgId,
      schedule.channel,
      period
    );

    await logAudit({
      orgId,
      actorId: userId,
      action: "flash_report.sent",
      entityType: "FlashReportSchedule",
      entityId: scheduleId,
      metadata: { channel: schedule.channel, period, delivered: result.delivered },
    });

    return { success: true, data: { delivered: result.delivered } };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to send flash report",
    };
  }
}

// ─── Schedule Management ────────────────────────────────────────────────────

export async function getFlashReportSchedulesAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof db.flashReportSchedule.findMany>>>
> {
  try {
    const { orgId } = await requireOrgContext();
    await requireFeature(orgId, "executiveHub");
    await requireFeature(orgId, "flashReports");

    const schedules = await db.flashReportSchedule.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: schedules };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load schedules",
    };
  }
}

export async function upsertFlashReportScheduleAction(input: {
  channel: "EMAIL" | "PUSH" | "WHATSAPP";
  schedule: "DAILY_9AM" | "WEEKLY_MONDAY" | "MONTHLY_1ST" | "CUSTOM_CRON";
  timezone?: string;
  customCron?: string;
  whatsappNumber?: string;
  isActive: boolean;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");
    await requireFeature(orgId, "executiveHub");
    await requireFeature(orgId, "flashReports");

    const record = await db.flashReportSchedule.upsert({
      where: {
        orgId_userId_channel: {
          orgId,
          userId,
          channel: input.channel,
        },
      },
      create: {
        orgId,
        userId,
        channel: input.channel,
        schedule: input.schedule,
        timezone: input.timezone ?? "Asia/Kolkata",
        customCron: input.customCron,
        whatsappNumber: input.whatsappNumber,
        isActive: input.isActive,
      },
      update: {
        schedule: input.schedule,
        timezone: input.timezone,
        customCron: input.customCron,
        whatsappNumber: input.whatsappNumber,
        isActive: input.isActive,
      },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "flash_report_schedule.upserted",
      entityType: "FlashReportSchedule",
      entityId: record.id,
      metadata: { channel: input.channel, schedule: input.schedule },
    });

    return { success: true, data: { id: record.id } };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to save schedule",
    };
  }
}

export async function deleteFlashReportScheduleAction(
  scheduleId: string
): Promise<ActionResult<null>> {
  try {
    const { orgId, userId } = await requireRole("admin");
    await requireFeature(orgId, "executiveHub");
    await requireFeature(orgId, "flashReports");

    const schedule = await db.flashReportSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule || schedule.orgId !== orgId) {
      return { success: false, error: "Schedule not found" };
    }

    await db.flashReportSchedule.delete({ where: { id: scheduleId } });

    await logAudit({
      orgId,
      actorId: userId,
      action: "flash_report_schedule.deleted",
      entityType: "FlashReportSchedule",
      entityId: scheduleId,
    });

    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to delete schedule",
    };
  }
}
