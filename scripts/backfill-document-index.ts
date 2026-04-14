/**
 * Phase 19 Sprint 19.1 — DocumentIndex backfill script
 *
 * Populates the DocumentIndex for all existing invoices, vouchers,
 * salary slips, and quotes in the database.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/backfill-document-index.ts
 *   # or, via the dev server's node runtime:
 *   node -r tsconfig-paths/register -r ts-node/register scripts/backfill-document-index.ts
 *
 * Rules:
 *   - idempotent (safe to re-run)
 *   - upserts, never duplicates
 *   - processes in pages of 100 to avoid memory pressure
 *   - reports counts on completion
 */

import { PrismaClient } from "../src/generated/prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new (PrismaClient as any)();

const PAGE_SIZE = 100;

async function backfillInvoices(): Promise<number> {
  let cursor: string | undefined;
  let count = 0;

  for (;;) {
    const rows = await db.invoice.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      include: { customer: true },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const inv of rows) {
      await db.documentIndex.upsert({
        where: {
          orgId_docType_documentId: {
            orgId: inv.organizationId,
            docType: "invoice",
            documentId: inv.id,
          },
        },
        create: {
          orgId: inv.organizationId,
          docType: "invoice",
          documentId: inv.id,
          documentNumber: inv.invoiceNumber,
          titleOrSummary: `Invoice ${inv.invoiceNumber}`,
          counterpartyLabel: inv.customer?.name ?? null,
          status: inv.status,
          primaryDate: new Date(inv.invoiceDate),
          amount: inv.totalAmount,
          currency: inv.displayCurrency ?? "INR",
          archivedAt: inv.archivedAt ?? null,
        },
        update: {
          documentNumber: inv.invoiceNumber,
          titleOrSummary: `Invoice ${inv.invoiceNumber}`,
          counterpartyLabel: inv.customer?.name ?? null,
          status: inv.status,
          primaryDate: new Date(inv.invoiceDate),
          amount: inv.totalAmount,
          currency: inv.displayCurrency ?? "INR",
          archivedAt: inv.archivedAt ?? null,
        },
      });
      count++;
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return count;
}

async function backfillVouchers(): Promise<number> {
  let cursor: string | undefined;
  let count = 0;

  for (;;) {
    const rows = await db.voucher.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      include: { vendor: true },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const v of rows) {
      const typeLabel = v.type === "receipt" ? "Receipt" : "Payment";
      await db.documentIndex.upsert({
        where: {
          orgId_docType_documentId: {
            orgId: v.organizationId,
            docType: "voucher",
            documentId: v.id,
          },
        },
        create: {
          orgId: v.organizationId,
          docType: "voucher",
          documentId: v.id,
          documentNumber: v.voucherNumber,
          titleOrSummary: `${typeLabel} Voucher ${v.voucherNumber}`,
          counterpartyLabel: v.vendor?.name ?? null,
          status: v.status,
          primaryDate: new Date(v.voucherDate),
          amount: v.totalAmount,
          currency: "INR",
          archivedAt: v.archivedAt ?? null,
        },
        update: {
          documentNumber: v.voucherNumber,
          titleOrSummary: `${typeLabel} Voucher ${v.voucherNumber}`,
          counterpartyLabel: v.vendor?.name ?? null,
          status: v.status,
          primaryDate: new Date(v.voucherDate),
          amount: v.totalAmount,
          currency: "INR",
          archivedAt: v.archivedAt ?? null,
        },
      });
      count++;
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return count;
}

async function backfillSalarySlips(): Promise<number> {
  let cursor: string | undefined;
  let count = 0;

  for (;;) {
    const rows = await db.salarySlip.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      include: { employee: true },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const s of rows) {
      const primaryDate = new Date(s.year, s.month - 1, 1);
      await db.documentIndex.upsert({
        where: {
          orgId_docType_documentId: {
            orgId: s.organizationId,
            docType: "salary_slip",
            documentId: s.id,
          },
        },
        create: {
          orgId: s.organizationId,
          docType: "salary_slip",
          documentId: s.id,
          documentNumber: s.slipNumber,
          titleOrSummary: `Salary Slip ${s.slipNumber} — ${s.year}/${String(s.month).padStart(2, "0")}`,
          counterpartyLabel: s.employee?.name ?? null,
          status: s.status,
          primaryDate,
          amount: s.netPay,
          currency: "INR",
          archivedAt: s.archivedAt ?? null,
        },
        update: {
          documentNumber: s.slipNumber,
          titleOrSummary: `Salary Slip ${s.slipNumber} — ${s.year}/${String(s.month).padStart(2, "0")}`,
          counterpartyLabel: s.employee?.name ?? null,
          status: s.status,
          primaryDate,
          amount: s.netPay,
          currency: "INR",
          archivedAt: s.archivedAt ?? null,
        },
      });
      count++;
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return count;
}

async function backfillQuotes(): Promise<number> {
  let cursor: string | undefined;
  let count = 0;

  for (;;) {
    const rows = await db.quote.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      include: { customer: true },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const q of rows) {
      await db.documentIndex.upsert({
        where: {
          orgId_docType_documentId: {
            orgId: q.orgId,
            docType: "quote",
            documentId: q.id,
          },
        },
        create: {
          orgId: q.orgId,
          docType: "quote",
          documentId: q.id,
          documentNumber: q.quoteNumber,
          titleOrSummary: q.title || `Quote ${q.quoteNumber}`,
          counterpartyLabel: q.customer?.name ?? null,
          status: q.status,
          primaryDate: q.issueDate,
          amount: q.totalAmount,
          currency: q.currency ?? "INR",
          archivedAt: q.archivedAt ?? null,
        },
        update: {
          documentNumber: q.quoteNumber,
          titleOrSummary: q.title || `Quote ${q.quoteNumber}`,
          counterpartyLabel: q.customer?.name ?? null,
          status: q.status,
          primaryDate: q.issueDate,
          amount: q.totalAmount,
          currency: q.currency ?? "INR",
          archivedAt: q.archivedAt ?? null,
        },
      });
      count++;
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return count;
}

async function main() {
  console.log("Phase 19 Sprint 19.1 — DocumentIndex backfill starting…");

  const [invoices, vouchers, slips, quotes] = await Promise.all([
    backfillInvoices(),
    backfillVouchers(),
    backfillSalarySlips(),
    backfillQuotes(),
  ]);

  console.log("✅ Backfill complete:");
  console.log(`   Invoices:     ${invoices}`);
  console.log(`   Vouchers:     ${vouchers}`);
  console.log(`   Salary slips: ${slips}`);
  console.log(`   Quotes:       ${quotes}`);
  console.log(`   Total:        ${invoices + vouchers + slips + quotes}`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
