import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  getQueueSummary, 
  getSlaBreachAnalytics, 
  getWorkflowRunAnalytics, 
  getNotificationDeliveryAnalytics, 
  getPortalTicketOperationsAnalytics 
} from "../actions";
import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  db: {
    approvalRequest: { count: vi.fn() },
    invoiceTicket: { count: vi.fn(), findMany: vi.fn() },
    scheduledAction: { count: vi.fn() },
    deadLetterAction: { count: vi.fn() },
    notificationDelivery: { count: vi.fn(), findMany: vi.fn() },
    workflowRun: { findMany: vi.fn() },
    reportSnapshot: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
}));

describe("Operational Analytics Actions", () => {
  const mockOrgId = "org_123";

  beforeEach(() => {
    vi.clearAllMocks();
    (requireOrgContext as any).mockResolvedValue({ orgId: mockOrgId });
  });

  describe("getQueueSummary", () => {
    it("aggregates counts correctly", async () => {
      (db.approvalRequest.count as any)
        .mockResolvedValueOnce(5)  // pending
        .mockResolvedValueOnce(2); // overdue
      
      (db.invoiceTicket.count as any)
        .mockResolvedValueOnce(10) // open tickets
        .mockResolvedValueOnce(1); // breached tickets

      (db.scheduledAction.count as any).mockResolvedValueOnce(3);
      (db.deadLetterAction.count as any).mockResolvedValueOnce(4);
      
      (db.notificationDelivery.count as any)
        .mockResolvedValueOnce(6)  // failed
        .mockResolvedValueOnce(2); // terminal

      const summary = await getQueueSummary();

      expect(summary).toEqual({
        pendingApprovals: 5,
        overdueApprovals: 2,
        openTickets: 10,
        breachedTickets: 1,
        pendingScheduledActions: 3,
        deadLetteredActions: 4,
        failedDeliveries: 8, // 6 failed + 2 terminal
      });
    });
  });

  describe("getSlaBreachAnalytics", () => {
    it("filters by orgId and breachedAt", async () => {
      (db.invoiceTicket.findMany as any).mockResolvedValue([]);
      
      await getSlaBreachAnalytics({});
      
      expect(db.invoiceTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId: mockOrgId,
            breachedAt: { not: null },
          }),
        })
      );
    });
  });

  describe("getWorkflowRunAnalytics", () => {
    it("filters workflow runs by orgId and status", async () => {
      (db.workflowRun.findMany as any).mockResolvedValue([]);
      
      await getWorkflowRunAnalytics({ status: "COMPLETED" });
      
      expect(db.workflowRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workflow: { orgId: mockOrgId },
            status: "COMPLETED",
          }),
        })
      );
    });
  });

  describe("getNotificationDeliveryAnalytics", () => {
    it("filters notification deliveries by orgId and channel", async () => {
      (db.notificationDelivery.findMany as any).mockResolvedValue([]);
      
      await getNotificationDeliveryAnalytics({ channel: "EMAIL" });
      
      expect(db.notificationDelivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            notification: { organizationId: mockOrgId },
            channel: "EMAIL",
          }),
        })
      );
    });
  });

  describe("getPortalTicketOperationsAnalytics", () => {
    it("fetches ticket operations for org", async () => {
      (db.invoiceTicket.findMany as any).mockResolvedValue([]);
      
      await getPortalTicketOperationsAnalytics({});
      
      expect(db.invoiceTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId: mockOrgId,
          }),
        })
      );
    });
  });
});
