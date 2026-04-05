"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { AUDIT_ACTION_LABELS, getAuditCategory } from "@/lib/audit";
import { generateCSV } from "@/lib/csv";

export interface AuditLogRow {
  id: string;
  action: string;
  actionLabel: string;
  category: string;
  actorName: string;
  actorEmail: string;
  representedName: string | null;
  entityType: string | null;
  entityId: string | null;
  proxyGrantId: string | null;
  ipAddress: string | null;
  createdAt: string; // ISO
}

interface AuditFilters {
  dateFrom?: string;
  dateTo?: string;
  actorId?: string;
  category?: string;
  proxyOnly?: boolean;
  page?: number;
}

const PAGE_SIZE = 50;

function buildWhere(orgId: string, filters: AuditFilters) {
  const where: Record<string, unknown> = { orgId };

  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  if (filters.actorId) {
    where.actorId = filters.actorId;
  }

  if (filters.proxyOnly) {
    where.representedId = { not: null };
  }

  if (filters.category) {
    const prefixMap: Record<string, string[]> = {
      Access: ["member.", "proxy."],
      Documents: ["invoice.", "proof.", "salary.", "approval."],
      Settings: ["org."],
      System: ["cron.", "send.", "recurring."],
    };
    const prefixes = prefixMap[filters.category];
    if (prefixes) {
      where.OR = prefixes.map((p) => ({ action: { startsWith: p } }));
    }
  }

  return where;
}

export async function getAuditLogs(filters: AuditFilters = {}) {
  const { orgId } = await requireRole("admin");
  const page = Math.max(1, filters.page ?? 1);

  const where = buildWhere(orgId, filters);

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        actor: { select: { name: true, email: true } },
        represented: { select: { name: true } },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  const mapped: AuditLogRow[] = rows.map((r) => ({
    id: r.id,
    action: r.action,
    actionLabel: AUDIT_ACTION_LABELS[r.action] ?? r.action,
    category: getAuditCategory(r.action),
    actorName: r.actor.name,
    actorEmail: r.actor.email,
    representedName: r.represented?.name ?? null,
    entityType: r.entityType,
    entityId: r.entityId,
    proxyGrantId: r.proxyGrantId,
    ipAddress: r.ipAddress,
    createdAt: r.createdAt.toISOString(),
  }));

  return { rows: mapped, total, page };
}

export async function exportAuditLogsCSV(filters: AuditFilters = {}) {
  const { orgId } = await requireRole("admin");
  const where = buildWhere(orgId, filters);

  const rows = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000, // cap export
    include: {
      actor: { select: { name: true, email: true } },
      represented: { select: { name: true } },
    },
  });

  const headers = [
    "Timestamp",
    "Actor",
    "Actor Email",
    "Represented",
    "Action",
    "Label",
    "Category",
    "Entity Type",
    "Entity ID",
    "Proxy Grant ID",
    "IP Address",
  ];

  const csvRows = rows.map((r) => [
    r.createdAt.toISOString(),
    r.actor.name,
    r.actor.email,
    r.represented?.name ?? "",
    r.action,
    AUDIT_ACTION_LABELS[r.action] ?? r.action,
    getAuditCategory(r.action),
    r.entityType ?? "",
    r.entityId ?? "",
    r.proxyGrantId ?? "",
    r.ipAddress ?? "",
  ]);

  return generateCSV(headers, csvRows);
}

export async function getAuditActors() {
  const { orgId } = await requireRole("admin");

  const members = await db.member.findMany({
    where: { organizationId: orgId },
    select: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  }));
}
