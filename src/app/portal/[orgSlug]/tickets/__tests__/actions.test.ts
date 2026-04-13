import { describe, it, expect, vi, beforeEach } from "vitest";
import { listPortalTickets, submitPortalTicketReply } from "../actions";
import { db } from "@/lib/db";
import { requirePortalSession } from "@/lib/portal-auth";

vi.mock("@/lib/db", () => ({
  db: {
    invoiceTicket: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    ticketReply: {
      create: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    fileAttachment: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/portal-auth", () => ({
  requirePortalSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Portal Ticket Actions", () => {
  const mockSession = { customerId: "cust_123", orgId: "org_456", orgSlug: "test-org" };

  beforeEach(() => {
    vi.clearAllMocks();
    (requirePortalSession as any).mockResolvedValue(mockSession);
  });

  describe("listPortalTickets", () => {
    it("filters tickets by customerId and orgId", async () => {
      (db.invoiceTicket.findMany as any).mockResolvedValue([]);
      (db.invoiceTicket.count as any).mockResolvedValue(0);

      await listPortalTickets();

      expect(db.invoiceTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId: mockSession.orgId,
            invoice: { customerId: mockSession.customerId },
          }),
        })
      );
    });
  });

  describe("submitPortalTicketReply", () => {
    it("verifies ticket ownership before creating reply", async () => {
      (db.invoiceTicket.findFirst as any).mockResolvedValue(null);

      const result = await submitPortalTicketReply("ticket_000", { message: "Hello" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Ticket not found or access denied");
      expect(db.ticketReply.create).not.toHaveBeenCalled();
    });

    it("creates a reply with portalCustomerId when authorized", async () => {
      (db.invoiceTicket.findFirst as any).mockResolvedValue({ id: "ticket_000" });
      (db.customer.findUnique as any).mockResolvedValue({ name: "John Doe" });
      (db.ticketReply.create as any).mockResolvedValue({ id: "reply_123" });

      const result = await submitPortalTicketReply("ticket_000", { message: "Authorized reply" });

      expect(result.success).toBe(true);
      expect(db.ticketReply.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: "ticket_000",
            portalCustomerId: mockSession.customerId,
            authorName: "John Doe",
            isInternal: false,
          }),
        })
      );
    });

    it("links attachments if IDs are provided", async () => {
      (db.invoiceTicket.findFirst as any).mockResolvedValue({ id: "ticket_000" });
      (db.ticketReply.create as any).mockResolvedValue({ id: "reply_123" });

      await submitPortalTicketReply("ticket_000", { 
        message: "With files", 
        attachmentIds: ["att_1", "att_2"] 
      });

      expect(db.fileAttachment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ["att_1", "att_2"] } }),
          data: { entityType: "ticket_reply", entityId: "reply_123" },
        })
      );
    });
  });
});
