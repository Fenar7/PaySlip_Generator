/**
 * Phase 19 Sprint 19.1 — DocumentIndex / vault query tests
 *
 * Tests the upsertDocumentIndex, queryVault, and per-type sync helpers
 * from @/lib/docs-vault using vitest with hoisting-safe mock factories.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks (factories only — no top-level variable references) ────────────────

vi.mock("@/lib/db", () => ({
  db: {
    documentIndex: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
}));

// ─── Safe imports (after vi.mock) ─────────────────────────────────────────────

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import {
  upsertDocumentIndex,
  queryVault,
  syncInvoiceToIndex,
  syncVoucherToIndex,
  syncSalarySlipToIndex,
  syncQuoteToIndex,
  removeDocumentFromIndex,
} from "@/lib/docs-vault";

// Convenience: typed access to the mocked db.documentIndex
const di = db.documentIndex as unknown as {
  upsert: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
};
const invoiceModel = db.invoice as unknown as {
  findMany: ReturnType<typeof vi.fn>;
};

const ORG_ID = "org-test-1";

// ─── upsertDocumentIndex ──────────────────────────────────────────────────────

describe("upsertDocumentIndex", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls db.documentIndex.upsert with correct create/update payload", async () => {
    await upsertDocumentIndex({
      orgId: ORG_ID,
      docType: "invoice",
      documentId: "inv-1",
      documentNumber: "INV-001",
      titleOrSummary: "Invoice INV-001",
      counterpartyLabel: "Acme Ltd",
      status: "ISSUED",
      primaryDate: new Date("2026-04-01"),
      amount: 1000,
      currency: "INR",
      archivedAt: null,
    });

    expect(di.upsert).toHaveBeenCalledOnce();
    const call = di.upsert.mock.calls[0][0];

    expect(call.where).toEqual({
      orgId_docType_documentId: {
        orgId: ORG_ID,
        docType: "invoice",
        documentId: "inv-1",
      },
    });

    expect(call.create).toMatchObject({
      orgId: ORG_ID,
      docType: "invoice",
      documentId: "inv-1",
      documentNumber: "INV-001",
      status: "ISSUED",
      amount: 1000,
    });

    expect(call.update).toMatchObject({
      documentNumber: "INV-001",
      status: "ISSUED",
      amount: 1000,
    });
  });

  it("defaults currency to INR when not provided", async () => {
    await upsertDocumentIndex({
      orgId: ORG_ID,
      docType: "voucher",
      documentId: "v-1",
      documentNumber: "VOU-001",
      titleOrSummary: "Payment Voucher VOU-001",
      status: "draft",
      primaryDate: new Date("2026-04-01"),
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.currency).toBe("INR");
  });

  it("defaults amount to 0 when not provided", async () => {
    await upsertDocumentIndex({
      orgId: ORG_ID,
      docType: "salary_slip",
      documentId: "ss-0",
      documentNumber: "SS-000",
      titleOrSummary: "Salary Slip SS-000",
      status: "draft",
      primaryDate: new Date("2026-04-01"),
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.amount).toBe(0);
  });

  it("resolves null documentNumber to '(Draft)' placeholder on create", async () => {
    await upsertDocumentIndex({
      orgId: ORG_ID,
      docType: "invoice",
      documentId: "inv-draft-1",
      documentNumber: null,
      titleOrSummary: "Invoice Draft",
      status: "DRAFT",
      primaryDate: new Date("2026-05-01"),
      amount: 1500,
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.documentNumber).toBe("(Draft)");
    expect(call.update.documentNumber).toBe("(Draft)");
  });

  it("resolves null documentNumber to '(Draft)' placeholder on update", async () => {
    await upsertDocumentIndex({
      orgId: ORG_ID,
      docType: "voucher",
      documentId: "v-draft-1",
      documentNumber: null,
      titleOrSummary: "Payment Voucher Draft",
      status: "draft",
      primaryDate: new Date("2026-05-02"),
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.update.documentNumber).toBe("(Draft)");
  });

  it("resolves empty string documentNumber to '(Draft)' placeholder", async () => {
    await upsertDocumentIndex({
      orgId: ORG_ID,
      docType: "invoice",
      documentId: "inv-empty",
      documentNumber: "",
      titleOrSummary: "Invoice Empty Num",
      status: "DRAFT",
      primaryDate: new Date("2026-05-03"),
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.documentNumber).toBe("(Draft)");
  });

  it("preserves non-null official numbers unchanged", async () => {
    await upsertDocumentIndex({
      orgId: ORG_ID,
      docType: "invoice",
      documentId: "inv-issued-1",
      documentNumber: "INV-2026-00123",
      titleOrSummary: "Invoice INV-2026-00123",
      status: "ISSUED",
      primaryDate: new Date("2026-05-04"),
      amount: 9999,
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.documentNumber).toBe("INV-2026-00123");
  });
});

// ─── queryVault ───────────────────────────────────────────────────────────────

describe("queryVault", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: ORG_ID,
      userId: "user-1",
      role: "admin",
    });
    di.findMany.mockResolvedValue([]);
    di.count.mockResolvedValue(0);
    invoiceModel.findMany.mockResolvedValue([]);
  });

  it("always scopes query to orgId — no cross-org leakage", async () => {
    await queryVault({});
    const { where } = di.findMany.mock.calls[0][0];
    expect(where.orgId).toBe(ORG_ID);
  });

  it("defaults to active (archivedAt: null) when archived param omitted", async () => {
    await queryVault({});
    const { where } = di.findMany.mock.calls[0][0];
    expect(where.archivedAt).toBeNull();
  });

  it("shows only archived when archived='archived'", async () => {
    await queryVault({ archived: "archived" });
    const { where } = di.findMany.mock.calls[0][0];
    expect(where.archivedAt).toEqual({ not: null });
  });

  it("omits archivedAt filter entirely when archived='all'", async () => {
    await queryVault({ archived: "all" });
    const { where } = di.findMany.mock.calls[0][0];
    expect(where.archivedAt).toBeUndefined();
  });

  it("filters by docType when provided", async () => {
    await queryVault({ docType: "invoice" });
    const { where } = di.findMany.mock.calls[0][0];
    expect(where.docType).toBe("invoice");
  });

  it("omits docType filter when docType='all'", async () => {
    await queryVault({ docType: "all" });
    const { where } = di.findMany.mock.calls[0][0];
    expect(where.docType).toBeUndefined();
  });

  it("adds OR full-text search when search param is provided", async () => {
    await queryVault({ search: "Acme" });
    const { where } = di.findMany.mock.calls[0][0];
    expect(where.OR).toBeDefined();
    expect(where.OR.length).toBeGreaterThanOrEqual(2);
    const fields = where.OR.map((c: Record<string, unknown>) => Object.keys(c)[0]);
    expect(fields).toContain("documentNumber");
    expect(fields).toContain("counterpartyLabel");
  });

  it("skips OR search entirely when search is empty string", async () => {
    await queryVault({ search: "" });
    const { where } = di.findMany.mock.calls[0][0];
    expect(where.OR).toBeUndefined();
  });

  it("paginates with correct skip/take on page 2", async () => {
    di.count.mockResolvedValue(50);
    const result = await queryVault({ page: 2, limit: 10 });
    const { skip, take } = di.findMany.mock.calls[0][0];
    expect(skip).toBe(10);
    expect(take).toBe(10);
    expect(result.totalPages).toBe(5);
    expect(result.page).toBe(2);
  });

  it("returns total from db.count", async () => {
    di.count.mockResolvedValue(42);
    const result = await queryVault({});
    expect(result.total).toBe(42);
  });

  it("enriches invoice rows with pending proof and open ticket activity", async () => {
    di.findMany.mockResolvedValue([
      {
        id: "row-1",
        orgId: ORG_ID,
        docType: "invoice",
        documentId: "inv-1",
        documentNumber: "INV-001",
        titleOrSummary: "Invoice INV-001",
        counterpartyLabel: "Acme",
        status: "ISSUED",
        primaryDate: new Date("2026-04-01"),
        amount: 5000,
        currency: "INR",
        archivedAt: null,
        createdAt: new Date("2026-04-01"),
        updatedAt: new Date("2026-04-23"),
      },
    ]);
    invoiceModel.findMany.mockResolvedValue([
      {
        id: "inv-1",
        proofs: [{ id: "proof-1" }],
        tickets: [{ id: "ticket-1", category: "BILLING_QUERY", status: "OPEN" }],
      },
    ]);

    const result = await queryVault({});

    expect(invoiceModel.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORG_ID,
        id: { in: ["inv-1"] },
      },
      select: {
        id: true,
        proofs: {
          where: { reviewStatus: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true },
        },
        tickets: {
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, category: true, status: true },
        },
      },
    });
    expect(result.rows[0]?.operationalBadges).toEqual([
      {
        kind: "pending_proof",
        label: "Payment proof pending review",
        href: "/app/pay/proofs/proof-1",
      },
      {
        kind: "open_ticket",
        label: "Customer query open",
        href: "/app/flow/tickets/ticket-1",
      },
    ]);
  });
});

// ─── Per-type sync helpers ────────────────────────────────────────────────────

describe("syncInvoiceToIndex", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps invoice fields correctly including currency from displayCurrency", async () => {
    await syncInvoiceToIndex(ORG_ID, {
      id: "inv-1",
      invoiceNumber: "INV-001",
      status: "DRAFT",
      invoiceDate: "2026-04-01",
      totalAmount: 500,
      displayCurrency: "USD",
      archivedAt: null,
      customer: { name: "Client Co" },
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.docType).toBe("invoice");
    expect(call.create.counterpartyLabel).toBe("Client Co");
    expect(call.create.currency).toBe("USD");
    expect(call.create.amount).toBe(500);
  });

  it("falls back to INR when displayCurrency is null", async () => {
    await syncInvoiceToIndex(ORG_ID, {
      id: "inv-2",
      invoiceNumber: "INV-002",
      status: "PAID",
      invoiceDate: "2026-04-01",
      totalAmount: 1000,
      displayCurrency: null,
      archivedAt: null,
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.currency).toBe("INR");
  });

  it("propagates archivedAt when invoice is archived", async () => {
    const ts = new Date("2026-04-10");
    await syncInvoiceToIndex(ORG_ID, {
      id: "inv-3",
      invoiceNumber: "INV-003",
      status: "CANCELLED",
      invoiceDate: "2026-03-01",
      totalAmount: 0,
      displayCurrency: null,
      archivedAt: ts,
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.archivedAt).toEqual(ts);
    expect(call.update.archivedAt).toEqual(ts);
  });
});

describe("syncVoucherToIndex", () => {
  beforeEach(() => vi.clearAllMocks());

  it("labels receipt vouchers with 'Receipt'", async () => {
    await syncVoucherToIndex(ORG_ID, {
      id: "v-1",
      voucherNumber: "VOU-001",
      status: "draft",
      voucherDate: "2026-04-01",
      totalAmount: 200,
      type: "receipt",
      archivedAt: null,
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.titleOrSummary).toContain("Receipt");
    expect(call.create.docType).toBe("voucher");
  });

  it("labels payment vouchers with 'Payment'", async () => {
    await syncVoucherToIndex(ORG_ID, {
      id: "v-2",
      voucherNumber: "VOU-002",
      status: "approved",
      voucherDate: "2026-04-01",
      totalAmount: 300,
      type: "payment",
      archivedAt: null,
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.titleOrSummary).toContain("Payment");
  });

  it("includes vendor name as counterpartyLabel", async () => {
    await syncVoucherToIndex(ORG_ID, {
      id: "v-3",
      voucherNumber: "VOU-003",
      status: "draft",
      voucherDate: "2026-04-01",
      totalAmount: 150,
      type: "payment",
      archivedAt: null,
      vendor: { name: "Supplies Co" },
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.counterpartyLabel).toBe("Supplies Co");
  });
});

describe("syncSalarySlipToIndex", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets primaryDate to the first day of the payslip month", async () => {
    await syncSalarySlipToIndex(ORG_ID, {
      id: "ss-1",
      slipNumber: "SS-001",
      status: "draft",
      month: 3,
      year: 2026,
      netPay: 50000,
      archivedAt: null,
    });

    const call = di.upsert.mock.calls[0][0];
    const d: Date = call.create.primaryDate;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // 0-indexed → March
    expect(d.getDate()).toBe(1);
  });

  it("includes employee name as counterpartyLabel", async () => {
    await syncSalarySlipToIndex(ORG_ID, {
      id: "ss-2",
      slipNumber: "SS-002",
      status: "released",
      month: 4,
      year: 2026,
      netPay: 60000,
      archivedAt: null,
      employee: { name: "Jane Doe" },
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.counterpartyLabel).toBe("Jane Doe");
  });

  it("uses netPay as the amount field", async () => {
    await syncSalarySlipToIndex(ORG_ID, {
      id: "ss-3",
      slipNumber: "SS-003",
      status: "draft",
      month: 1,
      year: 2026,
      netPay: 75000,
      archivedAt: null,
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.amount).toBe(75000);
  });
});

// ─── Null-number draft handling (regression guard for invoice issue crash) ────

describe("syncInvoiceToIndex — draft with null invoiceNumber", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes null invoiceNumber through upsert boundary without crashing", async () => {
    await syncInvoiceToIndex(ORG_ID, {
      id: "inv-draft",
      invoiceNumber: null,
      status: "DRAFT",
      invoiceDate: "2026-05-01",
      totalAmount: 5000,
      archivedAt: null,
      customer: { name: "Client X" },
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.documentNumber).toBe("(Draft)");
    expect(call.create.status).toBe("DRAFT");
    expect(call.create.titleOrSummary).toBe("Invoice Draft");
    expect(call.create.counterpartyLabel).toBe("Client X");
  });
});

describe("syncVoucherToIndex — draft with null voucherNumber", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes null voucherNumber through upsert boundary without crashing", async () => {
    await syncVoucherToIndex(ORG_ID, {
      id: "v-draft",
      voucherNumber: null,
      status: "draft",
      voucherDate: "2026-05-02",
      totalAmount: 3000,
      type: "payment",
      archivedAt: null,
      vendor: { name: "Vendor Y" },
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.documentNumber).toBe("(Draft)");
    expect(call.create.status).toBe("draft");
    expect(call.create.titleOrSummary).toContain("Draft");
  });
});

describe("syncInvoiceToIndex — finalized invoice with real number", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the real invoiceNumber without placeholder", async () => {
    await syncInvoiceToIndex(ORG_ID, {
      id: "inv-issued",
      invoiceNumber: "INV-2026-00042",
      status: "ISSUED",
      invoiceDate: "2026-05-03",
      totalAmount: 12000,
      archivedAt: null,
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.documentNumber).toBe("INV-2026-00042");
    expect(call.create.titleOrSummary).toContain("INV-2026-00042");
    expect(call.create.status).toBe("ISSUED");
  });
});

describe("syncVoucherToIndex — approved voucher with real number", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the real voucherNumber without placeholder", async () => {
    await syncVoucherToIndex(ORG_ID, {
      id: "v-approved",
      voucherNumber: "VOU-2026-00015",
      status: "approved",
      voucherDate: "2026-05-04",
      totalAmount: 4500,
      type: "receipt",
      archivedAt: null,
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.documentNumber).toBe("VOU-2026-00015");
    expect(call.create.titleOrSummary).toContain("VOU-2026-00015");
  });
});

// ─── removeDocumentFromIndex ──────────────────────────────────────────────────

describe("removeDocumentFromIndex", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls db.documentIndex.deleteMany with correct where clause", async () => {
    await removeDocumentFromIndex(ORG_ID, "invoice", "inv-del-1");

    expect(di.deleteMany).toHaveBeenCalledOnce();
    expect(di.deleteMany).toHaveBeenCalledWith({
      where: {
        orgId: ORG_ID,
        docType: "invoice",
        documentId: "inv-del-1",
      },
    });
  });
});

describe("syncQuoteToIndex — quotes are first-class docs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses quote title as titleOrSummary", async () => {
    await syncQuoteToIndex(ORG_ID, {
      id: "q-1",
      quoteNumber: "QTE-001",
      title: "Web Development Proposal",
      status: "DRAFT",
      issueDate: new Date("2026-04-01"),
      totalAmount: 12000,
      currency: "INR",
      archivedAt: null,
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.titleOrSummary).toBe("Web Development Proposal");
    expect(call.create.docType).toBe("quote");
    expect(call.create.currency).toBe("INR");
  });

  it("falls back to 'Quote {quoteNumber}' when title is empty", async () => {
    await syncQuoteToIndex(ORG_ID, {
      id: "q-2",
      quoteNumber: "QTE-002",
      title: "",
      status: "SENT",
      issueDate: new Date("2026-04-02"),
      totalAmount: 5000,
      archivedAt: null,
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.titleOrSummary).toContain("QTE-002");
  });

  it("correctly reflects archivedAt when quote is archived", async () => {
    const archiveTs = new Date("2026-04-10");
    await syncQuoteToIndex(ORG_ID, {
      id: "q-3",
      quoteNumber: "QTE-003",
      title: "Archived Project Quote",
      status: "DECLINED",
      issueDate: new Date("2026-04-01"),
      totalAmount: 7500,
      archivedAt: archiveTs,
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.archivedAt).toEqual(archiveTs);
    expect(call.update.archivedAt).toEqual(archiveTs);
  });

  it("includes customer name as counterpartyLabel", async () => {
    await syncQuoteToIndex(ORG_ID, {
      id: "q-4",
      quoteNumber: "QTE-004",
      title: "Logo Design",
      status: "ACCEPTED",
      issueDate: new Date("2026-04-01"),
      totalAmount: 3500,
      archivedAt: null,
      customer: { name: "StartupCo" },
    });

    const call = di.upsert.mock.calls[0][0];
    expect(call.create.counterpartyLabel).toBe("StartupCo");
  });
});
