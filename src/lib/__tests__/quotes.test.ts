import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    orgDefaults: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    customer: { findFirst: vi.fn() },
    quote: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    quoteLineItem: { deleteMany: vi.fn(), createMany: vi.fn() },
    invoice: { create: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/docs/numbering", () => ({ nextDocumentNumber: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn() }));

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { nextDocumentNumber } from "@/lib/docs/numbering";
import {
  generateQuoteNumber,
  createQuote,
  sendQuote,
  acceptQuote,
  declineQuote,
  convertQuoteToInvoice,
  expireOverdueQuotes,
} from "../quotes";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function txProxy() {
  // The production code calls tx.orgDefaults / tx.quote / etc.
  // We make $transaction run the callback with `db` so all mocks are reachable.
  vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(db));
}

const ORG = "org-1";
const USER = "user-1";
const CUST = "cust-1";

const sampleLineItems = [
  { description: "Widget", quantity: 2, unitPrice: 100, taxRate: 18 },
  { description: "Gadget", quantity: 1, unitPrice: 200, taxRate: 18 },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("quotes service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txProxy();
  });

  // ── generateQuoteNumber ─────────────────────────────────────────────────

  describe("generateQuoteNumber", () => {
    it("returns formatted quote number using org prefix and counter", async () => {
      vi.mocked(db.orgDefaults.findUnique).mockResolvedValue({
        organizationId: ORG,
        quotePrefix: "QT",
        quoteCounter: 42,
      } as any);
      vi.mocked(db.orgDefaults.update).mockResolvedValue({} as any);

      const num = await generateQuoteNumber(ORG);

      expect(num).toBe("QT-00042");
    });

    it("increments counter correctly", async () => {
      vi.mocked(db.orgDefaults.findUnique).mockResolvedValue({
        organizationId: ORG,
        quotePrefix: "QT",
        quoteCounter: 7,
      } as any);
      vi.mocked(db.orgDefaults.update).mockResolvedValue({} as any);

      await generateQuoteNumber(ORG);

      expect(vi.mocked(db.orgDefaults.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { quoteCounter: 8 },
        }),
      );
    });
  });

  // ── createQuote ─────────────────────────────────────────────────────────

  describe("createQuote", () => {
    const baseParams = {
      orgId: ORG,
      userId: USER,
      customerId: CUST,
      title: "Test Quote",
      lineItems: sampleLineItems,
    };

    beforeEach(() => {
      vi.mocked(db.customer.findFirst).mockResolvedValue({ id: CUST } as any);
      vi.mocked(db.orgDefaults.findUnique).mockResolvedValue({
        organizationId: ORG,
        quotePrefix: "QT",
        quoteCounter: 1,
        quoteValidityDays: 14,
      } as any);
      vi.mocked(db.orgDefaults.update).mockResolvedValue({} as any);
      vi.mocked(db.quote.create).mockResolvedValue({
        id: "q-1",
        quoteNumber: "QT-00001",
        lineItems: [],
      } as any);
    });

    it("creates quote with line items in transaction", async () => {
      const result = await createQuote(baseParams);

      expect(db.quote.create).toHaveBeenCalledTimes(1);
      const createCall = vi.mocked(db.quote.create).mock.calls[0][0] as any;
      expect(createCall.data.lineItems.create).toHaveLength(2);
      expect(result.id).toBe("q-1");
    });

    it("validates required fields — customer must exist", async () => {
      vi.mocked(db.customer.findFirst).mockResolvedValue(null);

      await expect(createQuote(baseParams)).rejects.toThrow(
        "Customer not found",
      );
    });

    it("validates at least one line item is required", async () => {
      await expect(
        createQuote({ ...baseParams, lineItems: [] }),
      ).rejects.toThrow("At least one line item is required");
    });

    it("auto-calculates totals from line items", async () => {
      await createQuote(baseParams);

      const createCall = vi.mocked(db.quote.create).mock.calls[0][0] as any;
      // subtotal = 2*100 + 1*200 = 400
      expect(createCall.data.subtotal).toBe(400);
      // tax = 400 * 0.18 = 72
      expect(createCall.data.taxAmount).toBe(72);
      // total = 400 + 72 = 472
      expect(createCall.data.totalAmount).toBe(472);
    });

    it("generates public token (hex string)", async () => {
      await createQuote(baseParams);

      const createCall = vi.mocked(db.quote.create).mock.calls[0][0] as any;
      expect(createCall.data.publicToken).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ── sendQuote ───────────────────────────────────────────────────────────

  describe("sendQuote", () => {
    const draftQuote = {
      id: "q-1",
      orgId: ORG,
      status: "DRAFT",
      quoteNumber: "QT-00001",
      publicToken: "tok",
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 86400000),
      customer: { email: "a@b.com", name: "Alice" },
      org: { name: "Acme" },
    };

    it("only sends DRAFT quotes — throws for other statuses", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue({
        ...draftQuote,
        status: "SENT",
      } as any);

      await expect(sendQuote("q-1", ORG, USER)).rejects.toThrow(
        "Only draft quotes can be sent",
      );
    });

    it("transitions status to SENT", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue(draftQuote as any);
      vi.mocked(db.quote.update).mockResolvedValue({
        ...draftQuote,
        status: "SENT",
        validUntil: draftQuote.validUntil,
      } as any);

      await sendQuote("q-1", ORG, USER);

      expect(vi.mocked(db.quote.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "SENT" }),
        }),
      );
    });

    it("sends email via sendEmail", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue(draftQuote as any);
      vi.mocked(db.quote.update).mockResolvedValue({
        ...draftQuote,
        status: "SENT",
        validUntil: draftQuote.validUntil,
      } as any);

      await sendQuote("q-1", ORG, USER);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "a@b.com",
          subject: expect.stringContaining("QT-00001"),
        }),
      );
    });
  });

  // ── acceptQuote ─────────────────────────────────────────────────────────

  describe("acceptQuote", () => {
    const sentQuote = {
      id: "q-1",
      orgId: ORG,
      status: "SENT",
      publicToken: "valid-token",
      validUntil: new Date(Date.now() + 86400000),
    };

    it("only accepts SENT quotes", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue({
        ...sentQuote,
        status: "DRAFT",
      } as any);

      await expect(acceptQuote("q-1", "valid-token")).rejects.toThrow(
        "cannot be accepted",
      );
    });

    it("validates public token matches", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue(sentQuote as any);

      await expect(acceptQuote("q-1", "wrong-token")).rejects.toThrow(
        "Invalid token",
      );
    });

    it("transitions to ACCEPTED, sets acceptedAt", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue(sentQuote as any);
      vi.mocked(db.quote.update).mockResolvedValue({
        ...sentQuote,
        status: "ACCEPTED",
      } as any);

      const result = await acceptQuote("q-1", "valid-token");

      expect(result.status).toBe("ACCEPTED");
      const updateCall = vi.mocked(db.quote.update).mock.calls[0][0] as any;
      expect(updateCall.data.status).toBe("ACCEPTED");
      expect(updateCall.data.acceptedAt).toBeInstanceOf(Date);
    });
  });

  // ── declineQuote ────────────────────────────────────────────────────────

  describe("declineQuote", () => {
    const sentQuote = {
      id: "q-1",
      orgId: ORG,
      status: "SENT",
      publicToken: "valid-token",
    };

    it("only declines SENT quotes", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue({
        ...sentQuote,
        status: "ACCEPTED",
      } as any);

      await expect(
        declineQuote("q-1", "valid-token"),
      ).rejects.toThrow("cannot be declined");
    });

    it("validates public token", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue(sentQuote as any);

      await expect(declineQuote("q-1", "wrong-token")).rejects.toThrow(
        "Invalid token",
      );
    });

    it("transitions to DECLINED with optional reason", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue(sentQuote as any);
      vi.mocked(db.quote.update).mockResolvedValue({
        ...sentQuote,
        status: "DECLINED",
      } as any);

      await declineQuote("q-1", "valid-token", "Too expensive");

      const updateCall = vi.mocked(db.quote.update).mock.calls[0][0] as any;
      expect(updateCall.data.status).toBe("DECLINED");
      expect(updateCall.data.declineReason).toBe("Too expensive");
    });
  });

  // ── convertQuoteToInvoice ───────────────────────────────────────────────

  describe("convertQuoteToInvoice", () => {
    const acceptedQuote = {
      id: "q-1",
      orgId: ORG,
      status: "ACCEPTED",
      customerId: CUST,
      totalAmount: 472,
      notes: "some notes",
      convertedInvoiceId: null,
      lineItems: [
        {
          description: "Widget",
          quantity: 2,
          unitPrice: 100,
          taxRate: 18,
          amount: 236,
          sortOrder: 0,
        },
      ],
    };

    beforeEach(() => {
      vi.mocked(nextDocumentNumber).mockResolvedValue("INV-00001");
    });

    it("only converts ACCEPTED quotes", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue({
        ...acceptedQuote,
        status: "DRAFT",
        convertedInvoiceId: null,
      } as any);

      await expect(
        convertQuoteToInvoice("q-1", ORG, USER),
      ).rejects.toThrow("Only accepted quotes");
    });

    it("creates invoice with matching line items", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue(acceptedQuote as any);
      vi.mocked(db.invoice.create).mockResolvedValue({ id: "inv-1" } as any);
      vi.mocked(db.quote.update).mockResolvedValue({} as any);

      const result = await convertQuoteToInvoice("q-1", ORG, USER);

      expect(result.id).toBe("inv-1");
      const createCall = vi.mocked(db.invoice.create).mock.calls[0][0] as any;
      expect(createCall.data.lineItems.create).toHaveLength(1);
      expect(createCall.data.totalAmount).toBe(472);
    });

    it("idempotent: returns existing invoice if convertedInvoiceId already set", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue({
        ...acceptedQuote,
        convertedInvoiceId: "inv-existing",
      } as any);
      vi.mocked(db.invoice.findUnique).mockResolvedValue({
        id: "inv-existing",
      } as any);

      const result = await convertQuoteToInvoice("q-1", ORG, USER);

      expect(result.id).toBe("inv-existing");
      expect(db.invoice.create).not.toHaveBeenCalled();
    });

    it("sets quote status to CONVERTED and logs audit", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue(acceptedQuote as any);
      vi.mocked(db.invoice.create).mockResolvedValue({ id: "inv-1" } as any);
      vi.mocked(db.quote.update).mockResolvedValue({} as any);

      await convertQuoteToInvoice("q-1", ORG, USER);

      expect(vi.mocked(db.quote.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "CONVERTED" }),
        }),
      );
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "quote_converted" }),
      );
    });
  });

  // ── expireOverdueQuotes ─────────────────────────────────────────────────

  describe("expireOverdueQuotes", () => {
    it("marks SENT quotes past validUntil as EXPIRED", async () => {
      vi.mocked(db.quote.updateMany).mockResolvedValue({ count: 3 } as any);

      const result = await expireOverdueQuotes();

      expect(result).toEqual({ expired: 3 });
      expect(vi.mocked(db.quote.updateMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "SENT" }),
          data: { status: "EXPIRED" },
        }),
      );
    });

    it("does not expire ACCEPTED/CONVERTED/DECLINED quotes (only targets SENT)", async () => {
      vi.mocked(db.quote.updateMany).mockResolvedValue({ count: 0 } as any);

      await expireOverdueQuotes();

      const call = vi.mocked(db.quote.updateMany).mock.calls[0][0] as any;
      expect(call.where.status).toBe("SENT");
    });
  });
});
