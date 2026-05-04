import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { isDatabaseReachable } from "../../__tests__/db-check";
import { diagnoseSequence, previewResequence, applyResequence } from "../sequence-resequence";
import { SequenceEngineError } from "../sequence-engine-errors";

const dbReachable = await isDatabaseReachable();
const TEST_ACTOR_ID = "3982aca3-3e1f-4b22-aa76-2b1e206ebf07";

async function createTestOrg(slug?: string) {
  const org = await db.organization.create({
    data: { name: "Diag Test Org", slug: slug ?? `diag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
  });
  await db.profile.upsert({ where: { id: TEST_ACTOR_ID }, update: {}, create: { id: TEST_ACTOR_ID, name: "Test Actor", email: `diag-actor-${Date.now()}@test.com` } });
  return org;
}

async function createTestSequence(orgId: string) {
  const seq = await db.sequence.create({ data: { organizationId: orgId, name: "Invoice Sequence", documentType: "INVOICE", periodicity: "YEARLY", isActive: true } });
  await db.sequenceFormat.create({ data: { sequenceId: seq.id, formatString: "INV/{YYYY}/{NNNNN}", startCounter: 1, counterPadding: 5, isDefault: true } });
  return seq;
}

async function createInvoice(orgId: string, invoiceNumber: string, invoiceDate: Date, status = "ISSUED") {
  return db.invoice.create({ data: { organizationId: orgId, invoiceNumber, invoiceDate, status: status as any, formData: {} } });
}

describe.skipIf(!dbReachable)("diagnostics integration", () => {
  it("detects gaps in real data", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    await createInvoice(org.id, "INV/2026/00001", new Date("2026-03-15"));
    await createInvoice(org.id, "INV/2026/00005", new Date("2026-03-16"));

    const result = await diagnoseSequence({
      orgId: org.id, documentType: "INVOICE",
      startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
    });

    expect(result.summary.gaps).toBe(3);
    expect(result.gaps[0].missingCounter).toBe(2);
  });

  it("detects unparseable numbers", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    await createInvoice(org.id, "INV/2026/00001", new Date("2026-03-15"));
    await createInvoice(org.id, "BROKEN-!!!", new Date("2026-03-16"));

    const result = await diagnoseSequence({
      orgId: org.id, documentType: "INVOICE",
      startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
    });

    expect(result.irregularities.length).toBeGreaterThan(0);
    expect(result.irregularities.some((r) => r.documentId)).toBe(true);
  });

  it("reports zero gaps for consecutively numbered documents", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    await createInvoice(org.id, "INV/2026/00001", new Date("2026-03-15"));
    await createInvoice(org.id, "INV/2026/00002", new Date("2026-03-16"));
    await createInvoice(org.id, "INV/2026/00003", new Date("2026-03-17"));

    const result = await diagnoseSequence({
      orgId: org.id, documentType: "INVOICE",
      startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
    });

    expect(result.summary.gaps).toBe(0);
    expect(result.summary.irregularities).toBe(0);
  });
});

describe.skipIf(!dbReachable)("lock-date enforcement integration", () => {
  it("rejects preview when window overlaps lock date", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    await expect(
      previewResequence({
        orgId: org.id, documentType: "INVOICE",
        startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
        orderBy: "document_date",
        lockDate: new Date("2026-06-01"),
      })
    ).rejects.toThrow(SequenceEngineError);
  });

  it("rejects apply when window overlaps lock date", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    await createInvoice(org.id, "INV/2026/00001", new Date("2026-07-01"));

    // Window starts Jan 1 but lock date is Jun 1 — should be rejected
    await expect(
      applyResequence(
        {
          orgId: org.id, documentType: "INVOICE",
          startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
          orderBy: "document_date", lockDate: new Date("2026-06-01"),
          expectedFingerprint: "any",
        },
        { actorId: TEST_ACTOR_ID }
      )
    ).rejects.toThrow(SequenceEngineError);
  });

  it("allows preview when window is strictly after lock date", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);

    const result = await previewResequence({
      orgId: org.id, documentType: "INVOICE",
      startDate: new Date("2026-06-02"), endDate: new Date("2026-12-31"),
      orderBy: "document_date", lockDate: new Date("2026-06-01"),
    });

    expect(result).toBeDefined();
    expect(result.summary.totalDocuments).toBe(0);
  });
});
