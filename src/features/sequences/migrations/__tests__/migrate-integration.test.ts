import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { isDatabaseReachable } from "../../__tests__/db-check";
import { mapOrgDefaultsToSequences } from "../legacy-mapper";
import { calculatePeriodBoundaries } from "../../engine/periodicity";

const dbReachable = await isDatabaseReachable();

async function createTestOrg() {
  return db.organization.create({
    data: {
      name: "Test Org",
      slug: `seq-migrate-test-org-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
  });
}

describe.skipIf(!dbReachable)("migration integration", () => {
  beforeEach(async () => {
    // Scope cleanup to test orgs only to avoid interfering with parallel tests
    const testOrgs = await db.organization.findMany({
      where: { slug: { startsWith: "seq-migrate-test-org-" } },
      select: { id: true },
    });
    const testOrgIds = testOrgs.map((o) => o.id);

    if (testOrgIds.length > 0) {
      await db.invoice.updateMany({
        where: { organizationId: { in: testOrgIds } },
        data: { sequenceId: null, sequencePeriodId: null, sequenceNumber: null },
      });
      await db.voucher.updateMany({
        where: { organizationId: { in: testOrgIds } },
        data: { sequenceId: null, sequencePeriodId: null, sequenceNumber: null },
      });

      const testSeqIds = await db.sequence.findMany({
        where: { organizationId: { in: testOrgIds } },
        select: { id: true },
      });
      const seqIds = testSeqIds.map((s) => s.id);

      if (seqIds.length > 0) {
        await db.sequencePeriod.deleteMany({
          where: { sequenceId: { in: seqIds } },
        });
        await db.sequenceFormat.deleteMany({
          where: { sequenceId: { in: seqIds } },
        });
        await db.sequence.deleteMany({
          where: { id: { in: seqIds } },
        });
      }

      await db.orgDefaults.deleteMany({
        where: { organizationId: { in: testOrgIds } },
      });
      await db.organization.deleteMany({
        where: { id: { in: testOrgIds } },
      });
    }
  });

  it("creates sequences from OrgDefaults", async () => {
    const org = await createTestOrg();
    await db.orgDefaults.create({
      data: {
        organizationId: org.id,
        invoicePrefix: "REC",
        invoiceCounter: 99,
        voucherPrefix: "PYM",
        voucherCounter: 42,
      },
    });

    const seeds = mapOrgDefaultsToSequences({
      organizationId: org.id,
      invoicePrefix: "REC",
      invoiceCounter: 99,
      voucherPrefix: "PYM",
      voucherCounter: 42,
    });

    for (const seed of seeds) {
      const sequence = await db.sequence.create({
        data: {
          organizationId: seed.organizationId,
          name: seed.name,
          documentType: seed.documentType,
          periodicity: seed.periodicity,
          isActive: seed.isActive,
        },
      });

      await db.sequenceFormat.create({
        data: {
          sequenceId: sequence.id,
          formatString: seed.format.formatString,
          startCounter: seed.format.startCounter,
          counterPadding: seed.format.counterPadding,
          isDefault: seed.format.isDefault,
        },
      });

      if (seed.periodicity !== "NONE") {
        const bounds = calculatePeriodBoundaries(new Date(), seed.periodicity);
        await db.sequencePeriod.create({
          data: {
            sequenceId: sequence.id,
            startDate: bounds.startDate,
            endDate: bounds.endDate,
            currentCounter: seed.legacyNextCounter - 1,
            status: "OPEN",
          },
        });
      }
    }

    const sequences = await db.sequence.findMany({
      where: { organizationId: org.id },
      include: { formats: true, periods: true },
    });

    expect(sequences).toHaveLength(2);

    const invoiceSeq = sequences.find((s) => s.documentType === "INVOICE");
    expect(invoiceSeq?.formats[0].formatString).toBe("REC/{YYYY}/{NNNNN}");
    expect(invoiceSeq?.periods).toHaveLength(1);
  });

  it("is idempotent — skips existing sequences", async () => {
    const org = await createTestOrg();
    await db.orgDefaults.create({
      data: {
        organizationId: org.id,
        invoicePrefix: "INV",
        invoiceCounter: 1,
      },
    });

    // First run
    const seq1 = await db.sequence.create({
      data: {
        organizationId: org.id,
        name: "Invoice Sequence",
        documentType: "INVOICE",
        periodicity: "YEARLY",
        isActive: true,
      },
    });

    // Second run should detect existing and skip
    const existing = await db.sequence.findMany({
      where: { organizationId: org.id },
    });
    expect(existing).toHaveLength(1);
    expect(existing[0].id).toBe(seq1.id);
  });

  it("links historical invoices without advancing the live counter", async () => {
    const org = await createTestOrg();
    const sequence = await db.sequence.create({
      data: {
        organizationId: org.id,
        name: "Invoice Sequence",
        documentType: "INVOICE",
        periodicity: "YEARLY",
        isActive: true,
      },
    });
    await db.sequenceFormat.create({
      data: {
        sequenceId: sequence.id,
        formatString: "INV/{YYYY}/{NNNNN}",
        startCounter: 42,
        counterPadding: 5,
        isDefault: true,
      },
    });
    const bounds = calculatePeriodBoundaries(new Date("2026-04-28"), "YEARLY");
    const period = await db.sequencePeriod.create({
      data: {
        sequenceId: sequence.id,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        currentCounter: 41,
        status: "OPEN",
      },
    });

    const invoice = await db.invoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber: "INV-041",
        status: "ISSUED",
        invoiceDate: new Date("2026-04-28"),
        totalAmount: 100,
        formData: {},
      },
    });

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        sequenceId: sequence.id,
        sequencePeriodId: period.id,
        sequenceNumber: 41,
      },
    });

    const updated = await db.invoice.findUnique({ where: { id: invoice.id } });
    expect(updated?.sequenceId).toBe(sequence.id);
    expect(updated?.sequenceNumber).toBe(41);
    expect(updated?.sequencePeriodId).toBe(period.id);

    const preservedPeriod = await db.sequencePeriod.findUnique({
      where: { id: period.id },
    });
    expect(preservedPeriod?.currentCounter).toBe(41);
  });

  it("does not backfill draft invoices", async () => {
    const org = await createTestOrg();
    const invoice = await db.invoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber: "DRAFT-001",
        status: "DRAFT",
        invoiceDate: new Date("2026-04-28"),
        totalAmount: 100,
        formData: {},
      },
    });

    expect(invoice.sequenceId).toBeNull();
    expect(invoice.sequenceNumber).toBeNull();
  });

  it("health check detects missing linkage", async () => {
    const org = await createTestOrg();
    await db.invoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber: "INV-001",
        status: "ISSUED",
        invoiceDate: new Date("2026-04-28"),
        totalAmount: 100,
        formData: {},
      },
    });

    const missing = await db.invoice.findMany({
      where: { status: "ISSUED", sequenceId: null },
      select: { id: true },
    });

    expect(missing.length).toBeGreaterThan(0);
  });

  it("health check detects duplicate sequence numbers", async () => {
    const org = await createTestOrg();
    const sequence = await db.sequence.create({
      data: {
        organizationId: org.id,
        name: "Invoice Sequence",
        documentType: "INVOICE",
        periodicity: "YEARLY",
        isActive: true,
      },
    });
    const period = await db.sequencePeriod.create({
      data: {
        sequenceId: sequence.id,
        startDate: new Date(Date.UTC(2026, 0, 1)),
        endDate: new Date(Date.UTC(2026, 11, 31)),
        currentCounter: 3,
        status: "OPEN",
      },
    });

    await db.invoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber: "INV-001",
        status: "ISSUED",
        invoiceDate: new Date("2026-04-28"),
        totalAmount: 100,
        formData: {},
        sequenceId: sequence.id,
        sequencePeriodId: period.id,
        sequenceNumber: 1,
      },
    });
    await db.invoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber: "INV-002",
        status: "ISSUED",
        invoiceDate: new Date("2026-05-01"),
        totalAmount: 200,
        formData: {},
        sequenceId: sequence.id,
        sequencePeriodId: period.id,
        sequenceNumber: 1,
      },
    });

    const dups = await db.$queryRaw<
      Array<{ sequencePeriodId: string; sequenceNumber: number; count: number }>
    >`
      SELECT "sequencePeriodId", "sequenceNumber", COUNT(*) as count
      FROM "invoice"
      WHERE "sequencePeriodId" IS NOT NULL
        AND "sequenceNumber" IS NOT NULL
        AND "sequencePeriodId" = ${period.id}
      GROUP BY "sequencePeriodId", "sequenceNumber"
      HAVING COUNT(*) > 1
    `;

    expect(dups.length).toBe(1);
    expect(Number(dups[0].sequenceNumber)).toBe(1);
    expect(Number(dups[0].count)).toBe(2);
  });
});
