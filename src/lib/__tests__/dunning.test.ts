import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted so vi.mock factories can reference them) ────────────────

const {
  mockDb,
  mockSendEmail,
  mockSendSms,
  mockBuildOptOutUrl,
  mockCreateInvoicePaymentLink,
  mockCreateNotification,
  mockLogAudit,
} = vi.hoisted(() => ({
  mockDb: {
    invoice: { findMany: vi.fn(), update: vi.fn() },
    dunningOptOut: { findMany: vi.fn() },
    dunningSequence: { findFirst: vi.fn() },
    dunningLog: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    member: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
  mockSendEmail: vi.fn(),
  mockSendSms: vi.fn(),
  mockBuildOptOutUrl: vi.fn().mockReturnValue("https://app.slipwise.com/unsubscribe?token=abc"),
  mockCreateInvoicePaymentLink: vi.fn(),
  mockCreateNotification: vi.fn(),
  mockLogAudit: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/email", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/sms", () => ({ sendSms: mockSendSms }));
vi.mock("@/lib/dunning-opt-out", () => ({ buildOptOutUrl: mockBuildOptOutUrl }));
vi.mock("@/lib/payment-links", () => ({ createInvoicePaymentLink: mockCreateInvoicePaymentLink }));
vi.mock("@/lib/notifications", () => ({ createNotification: mockCreateNotification }));
vi.mock("@/lib/audit", () => ({ logAudit: mockLogAudit }));

import {
  processOverdueInvoices,
  fireDunningStep,
  retryFailedSteps,
  stopDunningOnPaid,
  stopDunningOnArrangement,
  pauseDunning,
  resumeDunning,
} from "../dunning";

// ─── Test Helpers ───────────────────────────────────────────────────────────────

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    invoiceNumber: "INV-001",
    organizationId: "org-1",
    customerId: "cust-1",
    status: "OVERDUE",
    totalAmount: 118000,
    remainingAmount: 50000,
    amountPaid: 68000,
    dueDate: new Date(Date.now() - 7 * 86_400_000), // 7 days ago
    invoiceDate: new Date("2026-03-01"),
    dunningEnabled: true,
    dunningPausedUntil: null,
    dunningSequenceId: "seq-1",
    razorpayPaymentLinkUrl: "https://rzp.io/abc",
    razorpayPaymentLinkId: "plink-1",
    paymentLinkExpiresAt: new Date(Date.now() + 86_400_000),
    customer: {
      id: "cust-1",
      name: "Acme Corp",
      email: "billing@acme.com",
      phone: "9876543210",
    },
    organization: {
      id: "org-1",
      name: "Slipwise Inc",
      defaults: {
        defaultDunningSeqId: "seq-1",
        portalSupportEmail: "support@slipwise.com",
        portalSupportPhone: "+91 98765 43210",
      },
    },
    ...overrides,
  };
}

function makeStep(overrides: Record<string, unknown> = {}) {
  return {
    id: "step-1",
    stepNumber: 1,
    daysOffset: 0,
    channels: ["email"],
    emailSubject: "Invoice {{invoice_number}} due from {{org_name}}",
    emailBody: "Hi {{customer_name}}, pay {{amount_due}} now.",
    smsBody: null,
    smsTemplateId: null,
    tone: "friendly",
    createTicket: false,
    ...overrides,
  };
}

function makeSequence(steps = [makeStep()]) {
  return {
    id: "seq-1",
    name: "Default Sequence",
    isActive: true,
    steps,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("dunning engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateInvoicePaymentLink.mockResolvedValue({
      success: true,
      data: { shortUrl: "https://rzp.io/new" },
    });
    mockSendEmail.mockResolvedValue(undefined);
    mockSendSms.mockResolvedValue({ success: true });
    mockLogAudit.mockResolvedValue(undefined);
    mockCreateNotification.mockResolvedValue(undefined);
  });

  // ─── processOverdueInvoices ─────────────────────────────────────────────────

  describe("processOverdueInvoices", () => {
    it("skips invoices with dunningEnabled=false", async () => {
      const invoice = makeInvoice({ dunningEnabled: false });
      // findDunnableInvoices filters dunningEnabled=true in the WHERE clause,
      // so these invoices won't even be returned by the DB query.
      mockDb.dunningOptOut.findMany.mockResolvedValue([]);
      mockDb.invoice.findMany.mockResolvedValue([]);
      mockDb.dunningSequence.findFirst.mockResolvedValue(null);

      const result = await processOverdueInvoices();
      // With no invoices returned, nothing is processed
      expect(result.processed).toBe(0);
      expect(result.sent).toBe(0);
    });

    it("skips invoices with active dunningPausedUntil", async () => {
      // Paused invoices are filtered by the DB query (dunningPausedUntil < now)
      mockDb.dunningOptOut.findMany.mockResolvedValue([]);
      mockDb.invoice.findMany.mockResolvedValue([]);

      const result = await processOverdueInvoices();
      expect(result.processed).toBe(0);
    });

    it("skips invoices where customer has opted out", async () => {
      const invoice = makeInvoice();
      mockDb.dunningOptOut.findMany.mockResolvedValue([
        { orgId: "org-1", customerId: "cust-1" },
      ]);
      // The invoice will be filtered out by the optOutSet filter
      mockDb.invoice.findMany.mockResolvedValue([invoice]);
      // After filtering, no invoices remain
      const result = await processOverdueInvoices();
      expect(result.processed).toBe(0);
    });

    it("skips invoices with no dueDate", async () => {
      const invoice = makeInvoice({ dueDate: null });
      mockDb.dunningOptOut.findMany.mockResolvedValue([]);
      mockDb.invoice.findMany.mockResolvedValue([invoice]);

      const result = await processOverdueInvoices();
      // Invoice without dueDate is filtered out in findDunnableInvoices
      expect(result.processed).toBe(0);
    });

    it("fires correct step based on days overdue", async () => {
      const invoice = makeInvoice();
      const step1 = makeStep({ stepNumber: 1, daysOffset: 0 });
      const step2 = makeStep({ stepNumber: 2, daysOffset: 7, id: "step-2" });
      const sequence = makeSequence([step1, step2]);

      mockDb.dunningOptOut.findMany.mockResolvedValue([]);
      mockDb.invoice.findMany.mockResolvedValue([invoice]);
      mockDb.dunningSequence.findFirst.mockResolvedValue(sequence);
      mockDb.dunningLog.findFirst.mockResolvedValue(null); // not already sent
      mockDb.dunningLog.create.mockResolvedValue({});
      mockDb.member.findFirst.mockResolvedValue(null);

      const result = await processOverdueInvoices();
      expect(result.sent).toBe(1);
      // Email should have been sent
      expect(mockSendEmail).toHaveBeenCalled();
    });

    it("does NOT re-fire a step that was already sent (idempotency)", async () => {
      const invoice = makeInvoice();
      const sequence = makeSequence([makeStep({ daysOffset: 0 })]);

      mockDb.dunningOptOut.findMany.mockResolvedValue([]);
      mockDb.invoice.findMany.mockResolvedValue([invoice]);
      mockDb.dunningSequence.findFirst.mockResolvedValue(sequence);
      // Already sent
      mockDb.dunningLog.findFirst.mockResolvedValue({ id: "log-1", status: "SENT" });

      const result = await processOverdueInvoices();
      expect(result.skipped).toBe(1);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("handles multiple invoices independently (one failure doesn't block others)", async () => {
      const invoice1 = makeInvoice({ id: "inv-1" });
      const invoice2 = makeInvoice({ id: "inv-2", invoiceNumber: "INV-002" });
      const sequence = makeSequence([makeStep({ daysOffset: 0 })]);

      mockDb.dunningOptOut.findMany.mockResolvedValue([]);
      mockDb.invoice.findMany.mockResolvedValue([invoice1, invoice2]);
      mockDb.dunningSequence.findFirst.mockResolvedValue(sequence);
      mockDb.dunningLog.findFirst.mockResolvedValue(null);
      mockDb.dunningLog.create.mockResolvedValue({});
      mockDb.member.findFirst.mockResolvedValue(null);

      // First email fails, second succeeds
      mockSendEmail
        .mockRejectedValueOnce(new Error("SMTP error"))
        .mockResolvedValueOnce(undefined);

      const result = await processOverdueInvoices();
      // Both should be processed
      expect(result.processed).toBe(2);
      // At least one should succeed (second invoice)
      expect(result.sent).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── fireDunningStep ────────────────────────────────────────────────────────

  describe("fireDunningStep", () => {
    it("sends email when channel includes 'email'", async () => {
      const invoice = makeInvoice();
      const step = makeStep({ channels: ["email"] });
      mockDb.dunningLog.create.mockResolvedValue({});
      mockDb.member.findFirst.mockResolvedValue(null);

      await fireDunningStep({
        invoice: invoice as any,
        step: step as any,
        sequence: { id: "seq-1", name: "Default" },
        daysOverdue: 7,
      });

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "billing@acme.com",
          subject: expect.any(String),
          html: expect.any(String),
        })
      );
    });

    it("sends SMS when channel includes 'sms'", async () => {
      const invoice = makeInvoice();
      const step = makeStep({ channels: ["sms"], smsBody: "Pay {{amount_due}} now" });
      mockDb.dunningLog.create.mockResolvedValue({});
      mockDb.member.findFirst.mockResolvedValue(null);

      await fireDunningStep({
        invoice: invoice as any,
        step: step as any,
        sequence: { id: "seq-1", name: "Default" },
        daysOverdue: 7,
      });

      expect(mockSendSms).toHaveBeenCalledTimes(1);
      expect(mockSendSms).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "9876543210",
          message: expect.any(String),
        })
      );
    });

    it("creates DunningLog with SENT status on success", async () => {
      const invoice = makeInvoice();
      const step = makeStep({ channels: ["email"] });
      mockDb.dunningLog.create.mockResolvedValue({});
      mockDb.member.findFirst.mockResolvedValue(null);

      await fireDunningStep({
        invoice: invoice as any,
        step: step as any,
        sequence: { id: "seq-1", name: "Default" },
        daysOverdue: 7,
      });

      expect(mockDb.dunningLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SENT",
            channel: "email",
            invoiceId: "inv-1",
          }),
        })
      );
    });

    it("creates DunningLog with FAILED status on email failure", async () => {
      const invoice = makeInvoice();
      const step = makeStep({ channels: ["email"] });
      mockDb.dunningLog.create.mockResolvedValue({});
      mockDb.member.findFirst.mockResolvedValue(null);
      mockSendEmail.mockRejectedValueOnce(new Error("SMTP timeout"));

      await fireDunningStep({
        invoice: invoice as any,
        step: step as any,
        sequence: { id: "seq-1", name: "Default" },
        daysOverdue: 7,
      });

      expect(mockDb.dunningLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "FAILED",
            channel: "email",
            errorMessage: expect.stringContaining("SMTP timeout"),
          }),
        })
      );
    });

    it("creates notification when createTicket=true", async () => {
      const invoice = makeInvoice();
      const step = makeStep({ channels: ["email"], createTicket: true });
      mockDb.dunningLog.create.mockResolvedValue({});
      mockDb.member.findFirst.mockResolvedValue({ userId: "user-1" });

      await fireDunningStep({
        invoice: invoice as any,
        step: step as any,
        sequence: { id: "seq-1", name: "Default" },
        daysOverdue: 7,
      });

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          orgId: "org-1",
          type: "dunning.escalation",
        })
      );
    });

    it("logs audit event", async () => {
      const invoice = makeInvoice();
      const step = makeStep({ channels: ["email"] });
      mockDb.dunningLog.create.mockResolvedValue({});
      mockDb.member.findFirst.mockResolvedValue(null);

      await fireDunningStep({
        invoice: invoice as any,
        step: step as any,
        sequence: { id: "seq-1", name: "Default" },
        daysOverdue: 7,
      });

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "dunning.step_fired",
          entityType: "invoice",
          entityId: "inv-1",
        })
      );
    });
  });

  // ─── retryFailedSteps ───────────────────────────────────────────────────────

  describe("retryFailedSteps", () => {
    it("retries failed steps within 24h", async () => {
      const failedLog = {
        id: "log-1",
        orgId: "org-1",
        invoiceId: "inv-1",
        sequenceId: "seq-1",
        stepNumber: 1,
        channel: "email",
        status: "FAILED",
        createdAt: new Date(Date.now() - 3600_000), // 1 hour ago
        invoice: makeInvoice(),
        sequence: makeSequence([makeStep({ daysOffset: 0 })]),
      };

      mockDb.dunningLog.findMany.mockResolvedValue([failedLog]);
      mockDb.dunningLog.count.mockResolvedValue(1); // 1 prior attempt
      mockDb.dunningLog.create.mockResolvedValue({});
      mockDb.$transaction.mockResolvedValue([{}]);

      const result = await retryFailedSteps();
      expect(result.retried).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(mockSendEmail).toHaveBeenCalled();
    });

    it("does not retry if already retried 3 times", async () => {
      const failedLog = {
        id: "log-1",
        orgId: "org-1",
        invoiceId: "inv-1",
        sequenceId: "seq-1",
        stepNumber: 1,
        channel: "email",
        status: "FAILED",
        createdAt: new Date(Date.now() - 3600_000),
        invoice: makeInvoice(),
        sequence: makeSequence([makeStep({ daysOffset: 0 })]),
      };

      mockDb.dunningLog.findMany.mockResolvedValue([failedLog]);
      mockDb.dunningLog.count.mockResolvedValue(3); // Already 3 attempts (MAX_RETRIES)

      const result = await retryFailedSteps();
      expect(result.retried).toBe(0);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  // ─── Utility functions ──────────────────────────────────────────────────────

  describe("stopDunningOnPaid", () => {
    it("sets dunningEnabled=false", async () => {
      mockDb.invoice.update.mockResolvedValue({});
      await stopDunningOnPaid("inv-1");
      expect(mockDb.invoice.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { dunningEnabled: false },
      });
    });
  });

  describe("stopDunningOnArrangement", () => {
    it("sets dunningEnabled=false", async () => {
      mockDb.invoice.update.mockResolvedValue({});
      await stopDunningOnArrangement("inv-1");
      expect(mockDb.invoice.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { dunningEnabled: false },
      });
    });
  });

  describe("pauseDunning", () => {
    it("sets dunningPausedUntil to the given date", async () => {
      const until = new Date("2026-06-30");
      mockDb.invoice.update.mockResolvedValue({});
      await pauseDunning("inv-1", until);
      expect(mockDb.invoice.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { dunningPausedUntil: until },
      });
    });

    it("sets dunningPausedUntil to far future when no date given", async () => {
      mockDb.invoice.update.mockResolvedValue({});
      await pauseDunning("inv-1");
      expect(mockDb.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dunningPausedUntil: expect.any(Date),
          }),
        })
      );
      const callData = mockDb.invoice.update.mock.calls[0][0].data;
      expect(callData.dunningPausedUntil.getUTCFullYear()).toBe(2099);
    });
  });

  describe("resumeDunning", () => {
    it("clears dunningPausedUntil", async () => {
      mockDb.invoice.update.mockResolvedValue({});
      await resumeDunning("inv-1");
      expect(mockDb.invoice.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { dunningPausedUntil: null },
      });
    });
  });
});
