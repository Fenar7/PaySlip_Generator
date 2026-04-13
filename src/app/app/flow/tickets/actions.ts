"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function listTickets(params?: {
  status?: string;
  search?: string;
  page?: number;
}) {
  const { orgId } = await requireOrgContext();
  const page = params?.page ?? 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const statusFilter =
    params?.status && ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(params.status)
      ? { status: params.status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" }
      : {};

  const searchFilter = params?.search
    ? {
        OR: [
          { submitterName: { contains: params.search, mode: "insensitive" as const } },
          { submitterEmail: { contains: params.search, mode: "insensitive" as const } },
          { invoice: { invoiceNumber: { contains: params.search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const where = {
    orgId,
    ...statusFilter,
    ...searchFilter,
  };

  const [tickets, total] = await Promise.all([
    db.invoiceTicket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        invoice: { select: { invoiceNumber: true } },
        _count: { select: { replies: true } },
      },
    }),
    db.invoiceTicket.count({ where }),
  ]);

  return {
    tickets,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getTicketCounts() {
  const { orgId } = await requireOrgContext();

  const [all, open, inProgress, resolved, closed, breached] = await Promise.all([
    db.invoiceTicket.count({ where: { orgId } }),
    db.invoiceTicket.count({ where: { orgId, status: "OPEN" } }),
    db.invoiceTicket.count({ where: { orgId, status: "IN_PROGRESS" } }),
    db.invoiceTicket.count({ where: { orgId, status: "RESOLVED" } }),
    db.invoiceTicket.count({ where: { orgId, status: "CLOSED" } }),
    db.invoiceTicket.count({ where: { orgId, breachedAt: { not: null }, status: { not: "RESOLVED" } } }),
  ]);

  return { all, open, inProgress, resolved, closed, breached };
}

// ─── SLA Computation ──────────────────────────────────────────────────────────

/**
 * Compute SLA deadlines for a ticket based on the org's SLA policy.
 * Returns null fields if no matching policy is found.
 */
export async function computeTicketSlaDeadlines(
  orgId: string,
  priority?: string | null,
  createdAt?: Date
): Promise<{ firstResponseDueAt: Date | null; resolutionDueAt: Date | null }> {
  const base = createdAt ?? new Date();

  // Find the most specific matching policy: priority-specific first, then default
  const policy = await db.ticketSlaPolicy.findFirst({
    where: {
      orgId,
      OR: [
        { priority: priority ?? null },
        { priority: null, isDefault: true },
      ],
    },
    orderBy: [{ priority: "asc" }, { isDefault: "desc" }],
  });

  if (!policy) return { firstResponseDueAt: null, resolutionDueAt: null };

  const firstResponseDueAt = new Date(
    base.getTime() + policy.firstResponseTargetMins * 60 * 1000
  );
  const resolutionDueAt = new Date(
    base.getTime() + policy.resolutionTargetMins * 60 * 1000
  );

  return { firstResponseDueAt, resolutionDueAt };
}

/**
 * Apply SLA deadlines to an existing ticket.
 * Should be called on ticket creation and priority changes.
 */
export async function applyTicketSla(
  ticketId: string
): Promise<ActionResult<{ firstResponseDueAt: Date | null; resolutionDueAt: Date | null }>> {
  const { orgId } = await requireOrgContext();

  const ticket = await db.invoiceTicket.findFirst({
    where: { id: ticketId, orgId },
  });

  if (!ticket) return { success: false, error: "Ticket not found" };

  const deadlines = await computeTicketSlaDeadlines(
    orgId,
    (ticket as { priority?: string }).priority ?? null,
    ticket.createdAt
  );

  await db.invoiceTicket.update({
    where: { id: ticketId },
    data: deadlines,
  });

  revalidatePath(`/app/flow/tickets/${ticketId}`);
  return { success: true, data: deadlines };
}

