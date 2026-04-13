"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import type {
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  Prisma,
  TicketCategory,
  TicketPriority,
  WorkflowRunStatus,
} from "@/generated/prisma/client";

import { logActivity } from "@/lib/activity";

// --- Report Snapshot Helper ---
export async function createIntelReportSnapshot(input: {
  orgId: string;
  userId: string;
  reportType: string;
  filters: Prisma.InputJsonValue;
  rowCount: number;
}) {
  const recentSnapshot = await db.reportSnapshot.findFirst({
    where: {
      orgId: input.orgId,
      reportType: input.reportType,
      createdBy: input.userId,
      downloadedAt: { gte: new Date(Date.now() - 60000) }
    }
  });

  if (recentSnapshot) {
    return { success: true, data: recentSnapshot.id };
  }

  const snapshot = await db.reportSnapshot.create({
    data: {
      orgId: input.orgId,
      reportType: input.reportType,
      filters: input.filters,
      rowCount: input.rowCount,
      downloadedAt: new Date(),
      createdBy: input.userId,
    },
  });

  const member = await db.member.findFirst({
    where: { userId: input.userId, organizationId: input.orgId },
    include: { user: { select: { email: true } } },
  });

  await logActivity({
    orgId: input.orgId,
    actorId: input.userId,
    actorName: member?.user?.email ?? "Staff",
    event: "report_snapshot_generated",
    docType: "snapshot",
    docId: snapshot.id,
    meta: { reportType: input.reportType },
  });

  return { success: true, data: snapshot.id };
}

// ==========================================
// 1. Queue Summary Analytics
// ==========================================
export async function getQueueSummary() {
  const { orgId } = await requireOrgContext();
  const now = new Date();

  const [
    pendingApprovals,
    overdueApprovals,
    openTickets,
    breachedTickets,
    pendingScheduledActions,
    deadLetteredActions,
    failedDeliveries,
    terminalDeliveries
  ] = await Promise.all([
    db.approvalRequest.count({ where: { orgId, status: "PENDING" } }),
    db.approvalRequest.count({ where: { orgId, status: "PENDING", dueAt: { lt: now } } }),
    db.invoiceTicket.count({ where: { orgId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.invoiceTicket.count({ where: { orgId, status: { not: "RESOLVED" }, breachedAt: { not: null } } }),
    db.scheduledAction.count({ where: { orgId, status: "PENDING" } }),
    db.deadLetterAction.count({ where: { orgId } }), // Dead letters accumulate until manually retried
    db.notificationDelivery.count({ where: { orgId, status: "FAILED" } }),
    db.notificationDelivery.count({ where: { orgId, status: "TERMINAL_FAILURE" } }),
  ]);

  return {
    pendingApprovals,
    overdueApprovals,
    openTickets,
    breachedTickets,
    pendingScheduledActions,
    deadLetteredActions,
    failedDeliveries: failedDeliveries + terminalDeliveries,
  };
}

// ==========================================
// 2. SLA Breach Analytics
// ==========================================
export interface SlaBreachFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  priority?: string;
}

export async function getSlaBreachAnalytics(filters: SlaBreachFilters) {
  const { orgId } = await requireOrgContext();

  const where: Prisma.InvoiceTicketWhereInput = {
    orgId,
    breachedAt: { not: null },
  };

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }
  if (filters.category) where.category = filters.category as TicketCategory;
  if (filters.priority) where.priority = filters.priority as TicketPriority;

  const tickets = await db.invoiceTicket.findMany({
    where,
    select: {
      id: true,
      category: true,
      priority: true,
      status: true,
      breachType: true,
      escalationLevel: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return tickets;
}

// ==========================================
// 3. Workflow Run Analytics
// ==========================================
export interface WorkflowRunFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  workflowId?: string;
}

export async function getWorkflowRunAnalytics(filters: WorkflowRunFilters) {
  const { orgId } = await requireOrgContext();

  const where: Prisma.WorkflowRunWhereInput = {
    workflow: { orgId }
  };

  if (filters.dateFrom || filters.dateTo) {
    where.startedAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }
  if (filters.status) where.status = filters.status as WorkflowRunStatus;
  if (filters.workflowId) where.workflowId = filters.workflowId;

  const runs = await db.workflowRun.findMany({
    where,
    include: {
      workflow: { select: { name: true, triggerType: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 500, // Reasonable bound for UI/reports
  });

  return runs;
}

// ==========================================
// 4. Notification Delivery Analytics
// ==========================================
export interface NotificationDeliveryFilters {
  dateFrom?: string;
  dateTo?: string;
  channel?: string;
  status?: string;
}

export async function getNotificationDeliveryAnalytics(filters: NotificationDeliveryFilters) {
  const { orgId } = await requireOrgContext();

  const where: Prisma.NotificationDeliveryWhereInput = {
    orgId,
  };

  if (filters.dateFrom || filters.dateTo) {
    where.queuedAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }
  if (filters.channel) where.channel = filters.channel as NotificationDeliveryChannel;
  if (filters.status) where.status = filters.status as NotificationDeliveryStatus;

  const deliveries = await db.notificationDelivery.findMany({
    where,
    include: {
      notification: { select: { type: true, sourceModule: true, sourceRef: true } }
    },
    orderBy: { queuedAt: "desc" },
    take: 500,
  });

  return deliveries;
}

// ==========================================
// 5. Portal Ticket Operations
// ==========================================
export interface PortalTicketOperationsFilters {
  dateFrom?: string;
  dateTo?: string;
}

export async function getPortalTicketOperationsAnalytics(filters: PortalTicketOperationsFilters) {
  const { orgId } = await requireOrgContext();

  const where: Prisma.InvoiceTicketWhereInput = { orgId };

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }

  const tickets = await db.invoiceTicket.findMany({
    where,
    select: {
      id: true,
      category: true,
      status: true,
      createdAt: true,
      firstRespondedAt: true,
      resolvedAt: true,
      replies: {
        select: {
          isInternal: true,
          portalCustomerId: true,
          attachments: { select: { id: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return tickets;
}
