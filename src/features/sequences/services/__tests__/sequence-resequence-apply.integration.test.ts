import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { isDatabaseReachable } from "../../__tests__/db-check";
import { applyResequence, previewResequence } from "../sequence-resequence";

const dbReachable = await isDatabaseReachable();
const TEST_ACTOR_ID = "3982aca3-3e1f-4b22-aa76-2b1e206ebf07";

async function createTestOrg(slug?: string) {
  const org = await db.organization.create({ data: { name: "Apply Test Org", slug: slug ?? `reseq-apply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` } });
  await db.profile.upsert({ where: { id: TEST_ACTOR_ID }, update: {}, create: { id: TEST_ACTOR_ID, name: "Test Actor", email: `reseq-apply-actor-${Date.now()}@test.com` } });
  return org;
}

async function createTestSequence(orgId: string, periodicity: string = "YEARLY") {
  const sequence = await db.sequence.create({ data: { organizationId: orgId, name: "Invoice Sequence", documentType: "INVOICE", periodicity: periodicity as any, isActive: true } });
  await db.sequenceFormat.create({ data: { sequenceId: sequence.id, formatString: "INV/{YYYY}/{NNNNN}", startCounter: 1, counterPadding: 5, isDefault: true } });
  return sequence;
}

async function createInvoice(orgId: string, invoiceNumber: string, invoiceDate: Date, status = "ISSUED") {
  return db.invoice.create({ data: { organizationId: orgId, invoiceNumber, invoiceDate, status: status as any, formData: {} } });
}

describe.skipIf(!dbReachable)("applyResequence integration", () => {
  const baseInput = (orgId: string) => ({
    orgId, documentType: "INVOICE" as const, startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), orderBy: "document_date" as const,
  });

  async function getFingerprint(orgId: string) {
    const preview = await previewResequence(baseInput(orgId));
    return preview.previewFingerprint;
  }

  it("updates invoice numbers to proposed values", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);
    const inv1 = await createInvoice(org.id, "INV/2026/00042", new Date("2026-03-15"));
    const inv2 = await createInvoice(org.id, "INV/2026/00099", new Date("2026-03-16"));
    const fp = await getFingerprint(org.id);

    const result = await applyResequence({ ...baseInput(org.id), expectedFingerprint: fp }, { actorId: TEST_ACTOR_ID });
    expect(result.summary.applied).toBe(2);
    expect((await db.invoice.findUnique({ where: { id: inv1.id } }))?.invoiceNumber).toBe("INV/2026/00001");
    expect((await db.invoice.findUnique({ where: { id: inv2.id } }))?.invoiceNumber).toBe("INV/2026/00002");
  });

  it("rejects apply when startDate is on or before lockDate", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);
    await createInvoice(org.id, "INV/2026/00042", new Date("2026-03-15"));

    await expect(
      applyResequence(
        { ...baseInput(org.id), lockDate: new Date("2026-06-01"), expectedFingerprint: "any" },
        { actorId: TEST_ACTOR_ID }
      )
    ).rejects.toThrow(/lock date/);
  });

  it("does not modify unchanged records", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);
    await createInvoice(org.id, "INV/2026/00001", new Date("2026-03-15"));
    await createInvoice(org.id, "INV/2026/00002", new Date("2026-03-16"));
    const fp = await getFingerprint(org.id);

    const result = await applyResequence({ ...baseInput(org.id), expectedFingerprint: fp }, { actorId: TEST_ACTOR_ID });
    expect(result.summary.applied).toBe(0);
    expect(result.summary.unchanged).toBe(2);
  });

  it("writes an audit log entry", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);
    await createInvoice(org.id, "INV/2026/00042", new Date("2026-03-15"));
    const fp = await getFingerprint(org.id);

    await applyResequence({ ...baseInput(org.id), expectedFingerprint: fp }, { actorId: TEST_ACTOR_ID });

    const audit = await db.auditLog.findFirst({ where: { orgId: org.id, action: "sequence.resequence_confirmed" }, orderBy: { createdAt: "desc" } });
    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe(TEST_ACTOR_ID);
    expect((audit?.metadata as Record<string, unknown>)?.applied).toBe(1);
  });

  it("preserves sequence metadata linkage with correct periodId", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);
    const inv = await createInvoice(org.id, "INV/2026/00042", new Date("2026-03-15"));
    const fp = await getFingerprint(org.id);

    await applyResequence({ ...baseInput(org.id), expectedFingerprint: fp }, { actorId: TEST_ACTOR_ID });

    const fresh = await db.invoice.findUnique({ where: { id: inv.id } });
    expect(fresh?.sequenceId).toBeTruthy();
    expect(fresh?.sequencePeriodId).toBeTruthy();
    expect(fresh?.sequenceNumber).toBe(1);

    const period = await db.sequencePeriod.findUnique({ where: { id: fresh?.sequencePeriodId! } });
    expect(period?.startDate.getFullYear()).toBe(2026);
  });

  it("refuses apply when fingerprint mismatches", async () => {
    const org = await createTestOrg();
    await createTestSequence(org.id);
    await createInvoice(org.id, "INV/2026/00042", new Date("2026-03-15"));
    const fp = await getFingerprint(org.id);

    await createInvoice(org.id, "INV/2026/00100", new Date("2026-03-10"));

    await expect(
      applyResequence({ ...baseInput(org.id), expectedFingerprint: fp }, { actorId: TEST_ACTOR_ID })
    ).rejects.toThrow(/Fingerprint mismatch/);
  });

  it("links multi-period documents to correct sequencePeriodId", async () => {
    const org = await createTestOrg();
    const seq = await createTestSequence(org.id);
    await createInvoice(org.id, "INV/2025/00042", new Date("2025-12-15"));
    await createInvoice(org.id, "INV/2026/00099", new Date("2026-03-15"));

    const preview = await previewResequence({
      orgId: org.id, documentType: "INVOICE",
      startDate: new Date("2025-01-01"), endDate: new Date("2026-12-31"), orderBy: "document_date",
    });

    const result = await applyResequence(
      { orgId: org.id, documentType: "INVOICE", startDate: new Date("2025-01-01"), endDate: new Date("2026-12-31"), orderBy: "document_date", expectedFingerprint: preview.previewFingerprint },
      { actorId: TEST_ACTOR_ID }
    );
    expect(result.summary.applied).toBe(2);

    const inv2025 = await db.invoice.findFirst({ where: { organizationId: org.id, invoiceDate: new Date("2025-12-15") }, include: { sequencePeriod: true } });
    const inv2026 = await db.invoice.findFirst({ where: { organizationId: org.id, invoiceDate: new Date("2026-03-15") }, include: { sequencePeriod: true } });

    expect(inv2025?.sequencePeriod?.startDate.getFullYear()).toBe(2025);
    expect(inv2026?.sequencePeriod?.startDate.getFullYear()).toBe(2026);
  });
});
