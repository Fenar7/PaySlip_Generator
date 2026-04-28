/**
 * Sprint 1.3 — Document Sequence Backfill
 *
 * Links existing finalized invoices and vouchers to their sequences
 * and assigns sequence numbers via the sequence engine.
 *
 * Rules:
 *   - ISSUED invoices → linked + sequence number assigned
 *   - approved vouchers → linked + sequence number assigned
 *   - DRAFT invoices / draft vouchers → left untouched (sequenceId IS NULL)
 *   - Processes oldest → newest to preserve chronological ordering
 *   - Batched cursor pagination to avoid memory pressure
 *   - Idempotent: re-running skips already-linked documents
 *
 * Usage:
 *   npx tsx scripts/backfill-document-sequences.ts
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { consumeSequenceNumber } from "@/features/sequences/services/sequence-engine";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

const PAGE_SIZE = 100;

interface BackfillResult {
  invoicesProcessed: number;
  vouchersProcessed: number;
  invoicesSkipped: number;
  vouchersSkipped: number;
  errors: Array<{ docId: string; docType: string; error: string }>;
}

async function backfillInvoices(result: BackfillResult): Promise<void> {
  let cursor: string | undefined;

  for (;;) {
    const rows = await db.invoice.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { invoiceDate: "asc" },
      where: {
        status: { in: ["ISSUED", "VIEWED", "DUE", "PARTIALLY_PAID", "PAID", "OVERDUE"] },
        sequenceId: null,
      },
      select: {
        id: true,
        organizationId: true,
        invoiceDate: true,
      },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const inv of rows) {
      const sequence = await db.sequence.findFirst({
        where: {
          organizationId: inv.organizationId,
          documentType: "INVOICE",
        },
        select: { id: true },
      });

      if (!sequence) {
        result.invoicesSkipped++;
        console.warn(
          `No invoice sequence found for org ${inv.organizationId}; skipping invoice ${inv.id}`
        );
        continue;
      }

      try {
        const docDate = new Date(inv.invoiceDate);
        const consumed = await consumeSequenceNumber({
          sequenceId: sequence.id,
          documentDate: docDate,
          orgId: inv.organizationId,
        });

        await db.invoice.update({
          where: { id: inv.id },
          data: {
            sequenceId: sequence.id,
            sequencePeriodId: consumed.periodId,
            sequenceNumber: consumed.sequenceNumber,
          },
        });

        result.invoicesProcessed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({ docId: inv.id, docType: "invoice", error: message });
        console.error(`Failed to backfill invoice ${inv.id}:`, message);
      }
    }

    if (rows.length < PAGE_SIZE) break;
  }
}

async function backfillVouchers(result: BackfillResult): Promise<void> {
  let cursor: string | undefined;

  for (;;) {
    const rows = await db.voucher.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { voucherDate: "asc" },
      where: {
        status: { not: "draft" },
        sequenceId: null,
      },
      select: {
        id: true,
        organizationId: true,
        voucherDate: true,
      },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const v of rows) {
      const sequence = await db.sequence.findFirst({
        where: {
          organizationId: v.organizationId,
          documentType: "VOUCHER",
        },
        select: { id: true },
      });

      if (!sequence) {
        result.vouchersSkipped++;
        console.warn(
          `No voucher sequence found for org ${v.organizationId}; skipping voucher ${v.id}`
        );
        continue;
      }

      try {
        const docDate = new Date(v.voucherDate);
        const consumed = await consumeSequenceNumber({
          sequenceId: sequence.id,
          documentDate: docDate,
          orgId: v.organizationId,
        });

        await db.voucher.update({
          where: { id: v.id },
          data: {
            sequenceId: sequence.id,
            sequencePeriodId: consumed.periodId,
            sequenceNumber: consumed.sequenceNumber,
          },
        });

        result.vouchersProcessed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({ docId: v.id, docType: "voucher", error: message });
        console.error(`Failed to backfill voucher ${v.id}:`, message);
      }
    }

    if (rows.length < PAGE_SIZE) break;
  }
}

async function main() {
  console.log("Sprint 1.3 — Document Sequence Backfill starting…\n");

  const result: BackfillResult = {
    invoicesProcessed: 0,
    vouchersProcessed: 0,
    invoicesSkipped: 0,
    vouchersSkipped: 0,
    errors: [],
  };

  await backfillInvoices(result);
  await backfillVouchers(result);

  console.log("\n───────────────────────────────────────────────────────────────");
  console.log("Backfill complete:");
  console.log(`  Invoices processed: ${result.invoicesProcessed}`);
  console.log(`  Invoices skipped:   ${result.invoicesSkipped}`);
  console.log(`  Vouchers processed: ${result.vouchersProcessed}`);
  console.log(`  Vouchers skipped:   ${result.vouchersSkipped}`);
  console.log(`  Errors:             ${result.errors.length}`);
  console.log("───────────────────────────────────────────────────────────────\n");

  if (result.errors.length > 0) {
    console.error("Some documents failed to backfill. Review errors above.");
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
