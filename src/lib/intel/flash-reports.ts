"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { computeExecutiveKpis, type ExecutiveSnapshot } from "./kpi-service";
import type { KpiResult } from "./kpi";
import { sendEmail } from "@/lib/email";
import { sendNotification } from "@/lib/push-notifications";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FlashReportPayload {
  orgId: string;
  orgName: string;
  period: string;
  generatedAt: string;
  kpis: KpiSummary[];
  topMovers: KpiSummary[];
}

export interface KpiSummary {
  id: string;
  label: string;
  value: string;
  change: string;
  trendIsPositive: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatKpiValue(kpi: KpiResult): string {
  switch (kpi.unit) {
    case "currency":
      return `₹${kpi.currentValue.toLocaleString("en-IN")}`;
    case "%":
      return `${kpi.currentValue}%`;
    case "months":
      return `${kpi.currentValue} mo`;
    case "days":
      return `${kpi.currentValue}d`;
    default:
      return String(kpi.currentValue);
  }
}

function formatChange(kpi: KpiResult): string {
  const sign = kpi.changePct >= 0 ? "+" : "";
  return `${sign}${kpi.changePct}%`;
}

function toSummary(kpi: KpiResult): KpiSummary {
  return {
    id: kpi.id,
    label: kpi.label,
    value: formatKpiValue(kpi),
    change: formatChange(kpi),
    trendIsPositive: kpi.trendIsPositive,
  };
}

function idempotencyKey(
  orgId: string,
  scheduleId: string,
  channel: string,
  period: string,
  dateKey: string
): string {
  return `${orgId}:${scheduleId}:${channel}:${period}:${dateKey}`;
}

function deliveryWindowKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 13);
}

// ─── Flash Report Generation ────────────────────────────────────────────────

export async function generateFlashReport(
  orgId: string,
  period: "MTD" | "QTD" | "YTD" = "MTD"
): Promise<FlashReportPayload> {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { name: true },
  });

  const snapshot: ExecutiveSnapshot = await computeExecutiveKpis(orgId, period);

  const kpiSummaries = snapshot.kpis.map(toSummary);

  // Top movers: sorted by absolute change magnitude
  const topMovers = [...kpiSummaries]
    .sort(
      (a, b) =>
        Math.abs(parseFloat(b.change)) - Math.abs(parseFloat(a.change))
    )
    .slice(0, 3);

  return {
    orgId,
    orgName: org.name,
    period,
    generatedAt: snapshot.generatedAt.toISOString(),
    kpis: kpiSummaries,
    topMovers,
  };
}

// ─── Delivery Logic ─────────────────────────────────────────────────────────

export async function deliverFlashReport(
  scheduleId: string,
  orgId: string,
  channel: "EMAIL" | "PUSH" | "WHATSAPP",
  period: "MTD" | "QTD" | "YTD" = "MTD"
): Promise<{ delivered: boolean; deliveryId: string | null }> {
  // Verify schedule belongs to this org (IDOR prevention)
  const schedule = await db.flashReportSchedule.findFirst({
    where: { id: scheduleId, orgId },
  });
  if (!schedule) {
    throw new Error("Flash report schedule not found or access denied");
  }

  const key = idempotencyKey(
    orgId,
    scheduleId,
    channel,
    period,
    deliveryWindowKey()
  );

  // Idempotency check
  const existing = await db.flashReportDelivery.findUnique({
    where: { idempotencyKey: key },
  });
  if (existing && existing.status === "DELIVERED") {
    return { delivered: true, deliveryId: existing.id };
  }

  // Generate the payload
  const payload = await generateFlashReport(orgId, period);

  // Create delivery record
  const delivery = await db.flashReportDelivery.upsert({
    where: { idempotencyKey: key },
    create: {
      scheduleId,
      orgId,
      channel,
      payload: payload as unknown as Prisma.InputJsonValue,
      status: "PENDING",
      idempotencyKey: key,
    },
    update: {
      payload: payload as unknown as Prisma.InputJsonValue,
      retryCount: { increment: 1 },
      status: "PENDING",
      errorMessage: null,
    },
  });

  try {
    // Channel-specific delivery
    switch (channel) {
      case "EMAIL":
        await deliverViaEmail(orgId, scheduleId, payload);
        break;
      case "PUSH":
        await deliverViaPush(orgId, scheduleId, payload);
        break;
      case "WHATSAPP":
        throw new Error("WhatsApp flash reports are not configured");
    }

    // Mark delivered
    await db.flashReportDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
    });

    await db.flashReportSchedule.update({
      where: { id: scheduleId },
      data: {
        lastDeliveredAt: new Date(),
        lastDeliveryStatus: "DELIVERED",
      },
    });

    return { delivered: true, deliveryId: delivery.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown delivery error";
    await db.flashReportDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "FAILED",
        errorMessage: msg,
      },
    });

    await db.flashReportSchedule.update({
      where: { id: scheduleId },
      data: { lastDeliveryStatus: "FAILED" },
    });

    return { delivered: false, deliveryId: delivery.id };
  }
}

// ─── Channel Handlers ───────────────────────────────────────────────────────

async function deliverViaEmail(
  orgId: string,
  scheduleId: string,
  payload: FlashReportPayload
): Promise<void> {
  const schedule = await db.flashReportSchedule.findFirst({
    where: { id: scheduleId, orgId },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!schedule) {
    throw new Error("Flash report schedule not found");
  }
  if (!schedule.user.email) {
    throw new Error("Flash report recipient does not have an email address");
  }

  const subject = `${payload.orgName} — Executive Flash Report (${payload.period})`;
  const body = buildEmailHtml(payload);
  await sendEmail({ to: schedule.user.email, subject, html: body });
}

async function deliverViaPush(
  orgId: string,
  scheduleId: string,
  payload: FlashReportPayload
): Promise<void> {
  const schedule = await db.flashReportSchedule.findFirst({
    where: { id: scheduleId, orgId },
    include: { user: { select: { id: true } } },
  });
  if (!schedule) {
    throw new Error("Flash report schedule not found");
  }

  const subscriptionCount = await db.pushSubscription.count({
    where: { userId: schedule.user.id },
  });

  if (subscriptionCount === 0) {
    throw new Error("No push subscriptions registered for this recipient");
  }

  const title = `${payload.orgName} Flash Report`;
  const body = payload.topMovers
    .map((m) => `${m.label}: ${m.value} (${m.change})`)
    .join(" | ");
  await sendNotification(schedule.user.id, title, body, "/app/intel/executive");
}

function buildEmailHtml(payload: FlashReportPayload): string {
  const rows = payload.kpis
    .map(
      (k) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${k.label}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">${k.value}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;color:${k.trendIsPositive ? "#16a34a" : "#dc2626"}">${k.change}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1e293b">${payload.orgName} — Flash Report</h2>
      <p style="color:#64748b">Period: ${payload.period} | Generated: ${new Date(payload.generatedAt).toLocaleDateString("en-IN")}</p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:8px;text-align:left">KPI</th>
            <th style="padding:8px;text-align:left">Value</th>
            <th style="padding:8px;text-align:left">Change</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
