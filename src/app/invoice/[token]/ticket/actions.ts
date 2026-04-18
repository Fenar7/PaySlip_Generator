"use server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function submitTicket(
  token: string,
  data: {
    submitterName: string;
    submitterEmail: string;
    category: string;
    description: string;
  }
): Promise<ActionResult<{ ticketId: string }>> {
  try {
    if (!data.submitterName.trim()) {
      return { success: false, error: "Name is required" };
    }
    if (!data.submitterEmail.trim() || !data.submitterEmail.includes("@")) {
      return { success: false, error: "A valid email is required" };
    }
    if (!["BILLING_QUERY", "AMOUNT_DISPUTE", "MISSING_ITEM", "OTHER"].includes(data.category)) {
      return { success: false, error: "Invalid category" };
    }
    if (!data.description.trim() || data.description.trim().length < 10) {
      return { success: false, error: "Description must be at least 10 characters" };
    }

    const publicToken = await db.publicInvoiceToken.findUnique({
      where: { token },
      include: { invoice: { select: { id: true, invoiceNumber: true } } },
    });

    if (!publicToken) {
      return { success: false, error: "Invalid or expired link" };
    }

    if (publicToken.expiresAt && publicToken.expiresAt < new Date()) {
      return { success: false, error: "This link has expired" };
    }

    const ticket = await db.invoiceTicket.create({
      data: {
        invoiceId: publicToken.invoiceId,
        orgId: publicToken.orgId,
        submitterToken: token,
        submitterName: data.submitterName.trim(),
        submitterEmail: data.submitterEmail.trim(),
        category: data.category as "BILLING_QUERY" | "AMOUNT_DISPUTE" | "MISSING_ITEM" | "OTHER",
        description: data.description.trim(),
        status: "OPEN",
      },
    });

    await logActivity({
      orgId: publicToken.orgId,
      actorName: data.submitterName.trim(),
      event: "ticket_opened",
      docType: "invoice",
      docId: publicToken.invoice.invoiceNumber,
      meta: {
        ticketId: ticket.id,
        category: data.category,
        submitterEmail: data.submitterEmail.trim(),
      },
    });

    // Sprint 25.1: fire ticket.opened workflow trigger
    const { fireWorkflowTrigger } = await import("@/lib/flow/workflow-engine");
    void fireWorkflowTrigger({
      triggerType: "ticket.opened",
      orgId: publicToken.orgId,
      sourceModule: "tickets",
      sourceEntityType: "InvoiceTicket",
      sourceEntityId: ticket.id,
      actorId: "public",
      payload: {
        invoiceId: publicToken.invoiceId,
        category: data.category,
        submitterEmail: data.submitterEmail.trim(),
      },
    });

    return { success: true, data: { ticketId: ticket.id } };
  } catch (error) {
    console.error("submitTicket error:", error);
    return { success: false, error: "Failed to submit ticket" };
  }
}
