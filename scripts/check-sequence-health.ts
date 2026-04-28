/**
 * Sprint 1.3 — Sequence Health Check
 *
 * Validates the integrity of the sequence subsystem after migration
 * and backfill. Checks for:
 *   - Missing sequence linkage on finalized documents
 *   - Duplicate sequence numbers within a period
 *   - Draft documents that were incorrectly linked
 *   - Orgs missing sequences for INVOICE or VOUCHER
 *
 * Usage:
 *   npx tsx scripts/check-sequence-health.ts
 *
 * Exit code:
 *   0 = all checks passed
 *   1 = one or more failures detected
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

interface HealthFailure {
  type:
    | "MISSING_SEQUENCE"
    | "MISSING_LINKAGE"
    | "DUPLICATE_SEQUENCE_NUMBER"
    | "DRAFT_LINKED"
    | "ORPHAN_PERIOD";
  severity: "critical" | "warn";
  detail: string;
  orgId?: string;
  documentId?: string;
}

interface HealthCheckResult {
  status: "ok" | "fail";
  failures: HealthFailure[];
  stats: {
    finalizedInvoices: number;
    linkedInvoices: number;
    finalizedVouchers: number;
    linkedVouchers: number;
    draftInvoices: number;
    draftLinkedInvoices: number;
    draftVouchers: number;
    draftLinkedVouchers: number;
    orgsWithSequences: number;
    totalOrgs: number;
  };
}

async function runHealthCheck(): Promise<HealthCheckResult> {
  const failures: HealthFailure[] = [];

  // 1. Count finalized vs linked invoices
  const finalizedInvoices = await db.invoice.count({
    where: {
      status: { not: "DRAFT" },
    },
  });
  const linkedInvoices = await db.invoice.count({
    where: {
      status: { not: "DRAFT" },
      sequenceId: { not: null },
    },
  });

  // 2. Count finalized vs linked vouchers
  const finalizedVouchers = await db.voucher.count({
    where: {
      status: { not: "draft" },
    },
  });
  const linkedVouchers = await db.voucher.count({
    where: {
      status: { not: "draft" },
      sequenceId: { not: null },
    },
  });

  // 3. Draft documents that should NOT be linked
  const draftInvoices = await db.invoice.count({
    where: { status: "DRAFT" },
  });
  const draftLinkedInvoices = await db.invoice.count({
    where: { status: "DRAFT", sequenceId: { not: null } },
  });

  const draftVouchers = await db.voucher.count({
    where: { status: "draft" },
  });
  const draftLinkedVouchers = await db.voucher.count({
    where: { status: "draft", sequenceId: { not: null } },
  });

  // 4. Orgs missing sequences
  const totalOrgs = await db.organization.count();
  const orgsWithSequences = await db.sequence.groupBy({
    by: ["organizationId"],
    _count: { organizationId: true },
  });
  const orgsWithSeqSet = new Set(orgsWithSequences.map((o) => o.organizationId));

  // Check for orgs missing INVOICE or VOUCHER sequences
  const allOrgs = await db.organization.findMany({
    select: { id: true },
  });
  for (const org of allOrgs) {
    const orgSeqs = await db.sequence.findMany({
      where: { organizationId: org.id },
      select: { documentType: true },
    });
    const types = new Set(orgSeqs.map((s) => s.documentType));
    if (!types.has("INVOICE")) {
      failures.push({
        type: "MISSING_SEQUENCE",
        severity: "warn",
        detail: `Org ${org.id} is missing an INVOICE sequence`,
        orgId: org.id,
      });
    }
    if (!types.has("VOUCHER")) {
      failures.push({
        type: "MISSING_SEQUENCE",
        severity: "warn",
        detail: `Org ${org.id} is missing a VOUCHER sequence`,
        orgId: org.id,
      });
    }
  }

  // 5. Duplicate sequence numbers within a period (invoices)
  const invoiceDups = await db.$queryRaw<
    Array<{ sequencePeriodId: string; sequenceNumber: number; count: number }>
  >`
    SELECT "sequencePeriodId", "sequenceNumber", COUNT(*) as count
    FROM "invoice"
    WHERE "sequencePeriodId" IS NOT NULL
      AND "sequenceNumber" IS NOT NULL
    GROUP BY "sequencePeriodId", "sequenceNumber"
    HAVING COUNT(*) > 1
  `;
  for (const dup of invoiceDups) {
    failures.push({
      type: "DUPLICATE_SEQUENCE_NUMBER",
      severity: "critical",
      detail: `Invoice period ${dup.sequencePeriodId} has duplicate sequence number ${dup.sequenceNumber} (${dup.count} occurrences)`,
    });
  }

  // 6. Duplicate sequence numbers within a period (vouchers)
  const voucherDups = await db.$queryRaw<
    Array<{ sequencePeriodId: string; sequenceNumber: number; count: number }>
  >`
    SELECT "sequencePeriodId", "sequenceNumber", COUNT(*) as count
    FROM "voucher"
    WHERE "sequencePeriodId" IS NOT NULL
      AND "sequenceNumber" IS NOT NULL
    GROUP BY "sequencePeriodId", "sequenceNumber"
    HAVING COUNT(*) > 1
  `;
  for (const dup of voucherDups) {
    failures.push({
      type: "DUPLICATE_SEQUENCE_NUMBER",
      severity: "critical",
      detail: `Voucher period ${dup.sequencePeriodId} has duplicate sequence number ${dup.sequenceNumber} (${dup.count} occurrences)`,
    });
  }

  // 7. Missing linkage on finalized docs (sample first 10 for reporting)
  if (linkedInvoices < finalizedInvoices) {
    const missingInvoices = await db.invoice.findMany({
      where: {
        status: { not: "DRAFT" },
        sequenceId: null,
      },
      take: 10,
      select: { id: true, organizationId: true },
    });
    for (const inv of missingInvoices) {
      failures.push({
        type: "MISSING_LINKAGE",
        severity: "critical",
        detail: `Invoice ${inv.id} is finalized but has no sequence linkage`,
        orgId: inv.organizationId,
        documentId: inv.id,
      });
    }
  }

  if (linkedVouchers < finalizedVouchers) {
    const missingVouchers = await db.voucher.findMany({
      where: {
        status: { not: "draft" },
        sequenceId: null,
      },
      take: 10,
      select: { id: true, organizationId: true },
    });
    for (const v of missingVouchers) {
      failures.push({
        type: "MISSING_LINKAGE",
        severity: "critical",
        detail: `Voucher ${v.id} is finalized but has no sequence linkage`,
        orgId: v.organizationId,
        documentId: v.id,
      });
    }
  }

  // 8. Drafts incorrectly linked
  if (draftLinkedInvoices > 0) {
    failures.push({
      type: "DRAFT_LINKED",
      severity: "warn",
      detail: `${draftLinkedInvoices} draft invoice(s) have sequence linkage (should be null)`,
    });
  }
  if (draftLinkedVouchers > 0) {
    failures.push({
      type: "DRAFT_LINKED",
      severity: "warn",
      detail: `${draftLinkedVouchers} draft voucher(s) have sequence linkage (should be null)`,
    });
  }

  const criticalCount = failures.filter((f) => f.severity === "critical").length;

  return {
    status: criticalCount > 0 ? "fail" : failures.length > 0 ? "ok" : "ok",
    failures,
    stats: {
      finalizedInvoices,
      linkedInvoices,
      finalizedVouchers,
      linkedVouchers,
      draftInvoices,
      draftLinkedInvoices,
      draftVouchers,
      draftLinkedVouchers,
      orgsWithSequences: orgsWithSeqSet.size,
      totalOrgs,
    },
  };
}

async function main() {
  console.log("Sprint 1.3 — Sequence Health Check starting…\n");

  const result = await runHealthCheck();

  console.log("Stats:");
  console.log(
    `  Finalized invoices: ${result.stats.linkedInvoices} / ${result.stats.finalizedInvoices} linked`
  );
  console.log(
    `  Finalized vouchers: ${result.stats.linkedVouchers} / ${result.stats.finalizedVouchers} linked`
  );
  console.log(
    `  Draft invoices:     ${result.stats.draftLinkedInvoices} / ${result.stats.draftInvoices} incorrectly linked`
  );
  console.log(
    `  Draft vouchers:     ${result.stats.draftLinkedVouchers} / ${result.stats.draftVouchers} incorrectly linked`
  );
  console.log(
    `  Orgs with sequences: ${result.stats.orgsWithSequences} / ${result.stats.totalOrgs}`
  );

  if (result.failures.length > 0) {
    console.log("\n───────────────────────────────────────────────────────────────");
    console.log(`Failures (${result.failures.length}):\n`);

    for (const f of result.failures) {
      const icon = f.severity === "critical" ? "🔴" : "⚠️ ";
      console.log(`${icon} [${f.type}] ${f.detail}`);
    }

    console.log("───────────────────────────────────────────────────────────────\n");
  }

  const criticalCount = result.failures.filter(
    (f) => f.severity === "critical"
  ).length;

  if (criticalCount > 0) {
    console.error(`${criticalCount} critical failure(s) found.`);
    process.exit(1);
  }

  if (result.failures.length > 0) {
    console.warn(`${result.failures.length} warning(s) found.`);
  }

  console.log("\n✅ Health check passed.");
}

main()
  .catch((err) => {
    console.error("Health check failed to run:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
