"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";

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

  const [all, open, inProgress, resolved, closed] = await Promise.all([
    db.invoiceTicket.count({ where: { orgId } }),
    db.invoiceTicket.count({ where: { orgId, status: "OPEN" } }),
    db.invoiceTicket.count({ where: { orgId, status: "IN_PROGRESS" } }),
    db.invoiceTicket.count({ where: { orgId, status: "RESOLVED" } }),
    db.invoiceTicket.count({ where: { orgId, status: "CLOSED" } }),
  ]);

  return { all, open, inProgress, resolved, closed };
}
