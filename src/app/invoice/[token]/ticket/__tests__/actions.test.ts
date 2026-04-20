import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  publicInvoiceTokenFindUnique: vi.fn(),
  ticketSlaPolicyFindFirst: vi.fn(),
  invoiceTicketCreate: vi.fn(),
  logActivity: vi.fn(),
  notifyOrgAdmins: vi.fn(),
  fireWorkflowTrigger: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    publicInvoiceToken: {
      findUnique: mocks.publicInvoiceTokenFindUnique,
    },
    ticketSlaPolicy: {
      findFirst: mocks.ticketSlaPolicyFindFirst,
    },
    invoiceTicket: {
      create: mocks.invoiceTicketCreate,
    },
  },
}));

vi.mock("@/lib/activity", () => ({
  logActivity: mocks.logActivity,
}));

vi.mock("@/lib/notifications", () => ({
  notifyOrgAdmins: mocks.notifyOrgAdmins,
}));

vi.mock("@/lib/flow/workflow-engine", () => ({
  fireWorkflowTrigger: mocks.fireWorkflowTrigger,
}));

import { submitTicket } from "../actions";

describe("submitTicket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.publicInvoiceTokenFindUnique.mockResolvedValue({
      token: "public-token",
      invoiceId: "inv-1",
      orgId: "org-1",
      expiresAt: null,
      invoice: { id: "inv-1", invoiceNumber: "INV-001" },
    });
    mocks.ticketSlaPolicyFindFirst.mockResolvedValue({
      id: "sla-1",
      firstResponseTargetMins: 30,
      resolutionTargetMins: 240,
    });
    mocks.invoiceTicketCreate.mockResolvedValue({ id: "ticket-1" });
    mocks.logActivity.mockResolvedValue(undefined);
    mocks.notifyOrgAdmins.mockResolvedValue(undefined);
    mocks.fireWorkflowTrigger.mockResolvedValue(undefined);
  });

  it("creates public tickets with SLA deadlines and notifies admins", async () => {
    const result = await submitTicket("public-token", {
      submitterName: "Jane Customer",
      submitterEmail: "jane@example.com",
      category: "BILLING_QUERY",
      description: "I need help understanding this invoice amount.",
    });

    expect(result).toEqual({
      success: true,
      data: { ticketId: "ticket-1" },
    });
    expect(mocks.invoiceTicketCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invoiceId: "inv-1",
          orgId: "org-1",
          firstResponseDueAt: expect.any(Date),
          resolutionDueAt: expect.any(Date),
        }),
      }),
    );
    expect(mocks.notifyOrgAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        type: "ticket_opened",
        link: "/app/flow/tickets/ticket-1",
      }),
    );
    expect(mocks.fireWorkflowTrigger).toHaveBeenCalled();
  });
});
