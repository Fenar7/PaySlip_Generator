import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { isDatabaseReachable } from "../../__tests__/db-check";
import { previewResequence } from "../sequence-resequence";

const dbReachable = await isDatabaseReachable();

async function createTestOrg(slug?: string) {
  return db.organization.create({
    data: {
      name: "Resequence Preview Test Org",
      slug: slug ?? `reseq-preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
  });
}

async function createTestSequence(orgId: string, documentType: "INVOICE" | "VOUCHER" = "INVOICE") {
  const sequence = await db.sequence.create({
    data: {
      organizationId: orgId,
      name: `${documentType === "INVOICE" ? "Invoice" : "Voucher"} Sequence`,
      documentType,
      periodicity: "YEARLY",
      isActive: true,
    },
  });

  await db.sequenceFormat.create({
    data: {
      sequenceId: sequence.id,
      formatString: "INV/{YYYY}/{NNNNN}",
      startCounter: 1,
      counterPadding: 5,
      isDefault: true,
    },
  });

  return sequence;
}

async function createInvoice(
  orgId: string,
  overrides: {
    invoiceNumber: string;
    invoiceDate: Date;
    status?: string;
  }
) {
  return db.invoice.create({
    data: {
      organizationId: orgId,
      invoiceNumber: overrides.invoiceNumber,
      invoiceDate: overrides.invoiceDate,
      status: (overrides.status ?? "ISSUED") as any,
      formData: {},
    },
  });
}

describe.skipIf(!dbReachable)("previewResequence integration", () => {
  it("returns empty result for an org with no finalized invoices", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    const result = await previewResequence({
      orgId: org.id,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.totalDocuments).toBe(0);
    expect(result.mappings).toHaveLength(0);
    expect(result.sequenceId).toBeTruthy();
  });

  it("previews renumbered mappings deterministically", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00042",
      invoiceDate: new Date("2026-03-15"),
    });
    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00099",
      invoiceDate: new Date("2026-03-16"),
    });
    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00150",
      invoiceDate: new Date("2026-06-01"),
    });

    const result = await previewResequence({
      orgId: org.id,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.totalDocuments).toBe(3);
    expect(result.summary.renumbered).toBe(3);
    expect(result.mappings[0].proposedNumber).toBe("INV/2026/00001");
    expect(result.mappings[1].proposedNumber).toBe("INV/2026/00002");
    expect(result.mappings[2].proposedNumber).toBe("INV/2026/00003");
  });

  it("identifies unchanged records", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00001",
      invoiceDate: new Date("2026-03-15"),
    });
    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00002",
      invoiceDate: new Date("2026-03-16"),
    });

    const result = await previewResequence({
      orgId: org.id,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.unchanged).toBe(2);
    expect(result.summary.renumbered).toBe(0);
  });

  it("does not mutate documents", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    const inv = await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00042",
      invoiceDate: new Date("2026-03-15"),
    });

    await previewResequence({
      orgId: org.id,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    const fresh = await db.invoice.findUnique({ where: { id: inv.id } });
    expect(fresh?.invoiceNumber).toBe("INV/2026/00042");
  });

  it("does not consume sequence counters", async () => {
    const org = await createTestOrg();
    const sequence = await createTestSequence(org.id);

    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00042",
      invoiceDate: new Date("2026-03-15"),
    });

    // Check period counters before preview
    const periodsBefore = await db.sequencePeriod.findMany({
      where: { sequenceId: sequence.id },
    });

    await previewResequence({
      orgId: org.id,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    const periodsAfter = await db.sequencePeriod.findMany({
      where: { sequenceId: sequence.id },
    });

    expect(periodsAfter).toHaveLength(periodsBefore.length);
    if (periodsBefore.length > 0) {
      expect(periodsAfter[0].currentCounter).toBe(periodsBefore[0].currentCounter);
    }
  });

  it("sorts by document_date deterministically", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    // Create in reverse date order
    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00003",
      invoiceDate: new Date("2026-06-01"),
    });
    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00001",
      invoiceDate: new Date("2026-01-15"),
    });
    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00002",
      invoiceDate: new Date("2026-03-01"),
    });

    const result = await previewResequence({
      orgId: org.id,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    // Sorted by date ascending
    expect(result.mappings[0].oldNumber).toBe("INV/2026/00001");
    expect(result.mappings[1].oldNumber).toBe("INV/2026/00002");
    expect(result.mappings[2].oldNumber).toBe("INV/2026/00003");
  });

  it("sorts by current_number", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00042",
      invoiceDate: new Date("2026-03-15"),
    });
    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00007",
      invoiceDate: new Date("2026-06-01"),
    });
    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00099",
      invoiceDate: new Date("2026-01-15"),
    });

    const result = await previewResequence({
      orgId: org.id,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "current_number",
    });

    expect(result.mappings[0].oldCounter).toBe(7);
    expect(result.mappings[1].oldCounter).toBe(42);
    expect(result.mappings[2].oldCounter).toBe(99);
  });

  it("marks unparseable numbers as blocked with reason", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00001",
      invoiceDate: new Date("2026-03-15"),
    });
    await createInvoice(org.id, {
      invoiceNumber: "",
      invoiceDate: new Date("2026-03-16"),
    });

    const result = await previewResequence({
      orgId: org.id,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.blocked).toBe(1);
    const blocked = result.mappings.find((m) => m.status === "blocked")!;
    expect(blocked.reason).toContain("Cannot parse existing number");
    expect(blocked.proposedNumber).toBeNull();
  });

  it("excludes DRAFT invoices from preview", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    await createInvoice(org.id, {
      invoiceNumber: "DRAFT-NUM",
      invoiceDate: new Date("2026-03-15"),
      status: "DRAFT",
    });
    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00001",
      invoiceDate: new Date("2026-03-16"),
      status: "ISSUED",
    });

    const result = await previewResequence({
      orgId: org.id,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
    });

    expect(result.summary.totalDocuments).toBe(1);
    expect(result.mappings[0].oldNumber).toBe("INV/2026/00001");
  });

  it("lockDate prevents duplicate proposals from locked records", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00001",
      invoiceDate: new Date("2026-01-15"),
    });
    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00002",
      invoiceDate: new Date("2026-01-20"),
    });
    await createInvoice(org.id, {
      invoiceNumber: "INV/2026/00099",
      invoiceDate: new Date("2026-03-15"),
    });

    const result = await previewResequence({
      orgId: org.id,
      documentType: "INVOICE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      orderBy: "document_date",
      lockDate: new Date("2026-02-28"),
    });

    // inv Jan 15 + Jan 20 are locked; inv Mar 15 should NOT be proposed as 00001
    const blockedDocs = result.mappings.filter((m) => m.status === "blocked");
    expect(blockedDocs).toHaveLength(2);

    const unlocked = result.mappings.find((m) => m.status !== "blocked")!;
    expect(unlocked.proposedNumber).not.toBe("INV/2026/00001");
    expect(unlocked.proposedCounter).toBe(3);

    // Verify no duplicate proposed numbers
    const proposedNumbers = result.mappings
      .filter((m) => m.proposedNumber !== null)
      .map((m) => m.proposedNumber);
    const uniqueProposed = new Set(proposedNumbers);
    expect(uniqueProposed.size).toBe(proposedNumbers.length);
  });
});
