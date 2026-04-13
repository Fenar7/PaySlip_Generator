"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getTicketDetail(ticketId: string) {
  const { orgId } = await requireOrgContext();

  const ticket = await db.invoiceTicket.findFirst({
    where: { id: ticketId, orgId },
    include: {
      invoice: { select: { id: true, invoiceNumber: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { attachments: true },
      },
    },
  });

  return ticket;
}

export async function replyToTicket(
  ticketId: string,
  data: { message: string; isInternal: boolean }
): Promise<ActionResult<{ replyId: string }>> {
  try {
    const { userId, orgId } = await requireOrgContext();

    if (!data.message.trim()) {
      return { success: false, error: "Message is required" };
    }

    const ticket = await db.invoiceTicket.findFirst({
      where: { id: ticketId, orgId },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    if (ticket.status === "CLOSED") {
      return { success: false, error: "Cannot reply to a closed ticket" };
    }

    // Idempotency check against double submit
    const existing = await db.ticketReply.findFirst({
      where: {
        ticketId,
        authorId: userId,
        message: data.message.trim(),
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
    });

    if (existing) {
      return { success: true, data: { replyId: existing.id } };
    }

    const member = await db.member.findFirst({
      where: { userId, organizationId: orgId },
      include: { user: { select: { email: true } } },
    });

    const actorName = member?.user?.email ?? "Staff";

    const reply = await db.ticketReply.create({
      data: {
        ticketId,
        authorId: userId,
        authorName: actorName,
        isInternal: data.isInternal,
        message: data.message.trim(),
      },
    });

    await logActivity({
      orgId,
      actorId: userId,
      actorName,
      event: "ticket_reply",
      docType: "ticket",
      docId: ticketId,
      meta: { isInternal: data.isInternal },
    });

    revalidatePath(`/app/flow/tickets/${ticketId}`);
    return { success: true, data: { replyId: reply.id } };
  } catch (error) {
    console.error("replyToTicket error:", error);
    return { success: false, error: "Failed to send reply" };
  }
}

export async function assignTicket(
  ticketId: string
): Promise<ActionResult<{ assigneeId: string }>> {
  try {
    const { userId, orgId } = await requireOrgContext();

    const ticket = await db.invoiceTicket.findFirst({
      where: { id: ticketId, orgId },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    const updateData: { assigneeId: string; status?: "IN_PROGRESS" } = {
      assigneeId: userId,
    };

    if (ticket.status === "OPEN") {
      updateData.status = "IN_PROGRESS";
    }

    const updated = await db.invoiceTicket.updateMany({
      where: { id: ticketId, status: ticket.status },
      data: updateData,
    });

    if (updated.count === 0) {
      return { success: false, error: "Ticket status was updated concurrently. Please try again." };
    }

    const member = await db.member.findFirst({
      where: { userId, organizationId: orgId },
      include: { user: { select: { email: true } } },
    });

    const actorName = member?.user?.email ?? "Staff";

    await logActivity({
      orgId,
      actorId: userId,
      actorName,
      event: "ticket_assigned",
      docType: "ticket",
      docId: ticketId,
    });

    revalidatePath(`/app/flow/tickets/${ticketId}`);
    revalidatePath("/app/flow/tickets");
    return { success: true, data: { assigneeId: userId } };
  } catch (error) {
    console.error("assignTicket error:", error);
    return { success: false, error: "Failed to assign ticket" };
  }
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

export async function updateTicketStatus(
  ticketId: string,
  status: string
): Promise<ActionResult<{ status: string }>> {
  try {
    const { userId, orgId } = await requireOrgContext();

    if (!["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(status)) {
      return { success: false, error: "Invalid status" };
    }

    const ticket = await db.invoiceTicket.findFirst({
      where: { id: ticketId, orgId },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    const allowed = ALLOWED_TRANSITIONS[ticket.status] ?? [];
    if (!allowed.includes(status)) {
      return {
        success: false,
        error: `Cannot transition from ${ticket.status} to ${status}`,
      };
    }

    const resolvedAt = status === "RESOLVED" ? new Date() : undefined;

    const updated = await db.invoiceTicket.updateMany({
      where: { id: ticketId, status: ticket.status },
      data: {
        status: status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
        ...(resolvedAt ? { resolvedAt } : {}),
      },
    });

    if (updated.count === 0) {
      return { success: false, error: "Ticket status was changed by another user." };
    }

    const member = await db.member.findFirst({
      where: { userId, organizationId: orgId },
      include: { user: { select: { email: true } } },
    });

    const actorName = member?.user?.email ?? "Staff";

    const eventMap: Record<string, string> = {
      IN_PROGRESS: "ticket_in_progress",
      RESOLVED: "ticket_resolved",
      CLOSED: "ticket_closed",
    };

    await logActivity({
      orgId,
      actorId: userId,
      actorName,
      event: eventMap[status] ?? `ticket_${status.toLowerCase()}`,
      docType: "ticket",
      docId: ticketId,
    });

    revalidatePath(`/app/flow/tickets/${ticketId}`);
    revalidatePath("/app/flow/tickets");
    return { success: true, data: { status } };
  } catch (error) {
    console.error("updateTicketStatus error:", error);
    return { success: false, error: "Failed to update ticket status" };
  }
}
