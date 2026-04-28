import "server-only";

import { db } from "@/lib/db";
import { confirmBankTransactionMatch, refreshReconciliationSuggestions } from "@/lib/accounting";
import type { MatchEntityType } from "@/generated/prisma/client";
import { formatIsoDate, toAccountingNumber } from "@/lib/accounting/utils";
import {
  scoreMatch,
  getDisposition,
  AUTO_CONFIRM_THRESHOLD,
  SUGGEST_THRESHOLD,
} from "./match-scorer";

export { AUTO_CONFIRM_THRESHOLD, SUGGEST_THRESHOLD };

interface AutoMatchResult {
  autoConfirmed: number;
  suggested: number;
  skipped: number;
  errors: Array<{ bankTxnId: string; error: string }>;
}

/**
 * After a statement import, run suggestions on every UNMATCHED transaction
 * and then auto-confirm any match that scores >= AUTO_CONFIRM_THRESHOLD.
 *
 * This is idempotent: already-MATCHED transactions are skipped, and
 * confirmBankTransactionMatch itself is idempotent for already-CONFIRMED matches.
 */
export async function runAutoMatchForImport(params: {
  importId: string;
  orgId: string;
  actorId: string;
}): Promise<AutoMatchResult> {
  const result: AutoMatchResult = {
    autoConfirmed: 0,
    suggested: 0,
    skipped: 0,
    errors: [],
  };

  const unmatchedTxns = await db.bankTransaction.findMany({
    where: {
      importId: params.importId,
      orgId: params.orgId,
      status: { in: ["UNMATCHED", "SUGGESTED"] },
    },
    select: { id: true },
  });

  if (unmatchedTxns.length === 0) {
    return result;
  }

  // Regenerate suggestions for all UNMATCHED transactions first.
  await refreshReconciliationSuggestions(params.orgId, {
    importId: params.importId,
  });

  // Re-fetch with match data to check for high-confidence candidates.
  const txnsWithMatches = await db.bankTransaction.findMany({
    where: {
      importId: params.importId,
      orgId: params.orgId,
      status: "SUGGESTED",
    },
    select: {
      id: true,
      amount: true,
      txnDate: true,
      reference: true,
      normalizedPayee: true,
      description: true,
      matches: {
        where: { status: "SUGGESTED" },
        orderBy: { confidenceScore: "desc" },
        take: 1,
      },
    },
  });

  for (const txn of txnsWithMatches) {
    const topMatch = txn.matches[0];
    if (!topMatch) {
      result.skipped++;
      continue;
    }

    // Re-score using the PRD-spec scorer for the final auto-confirm decision.
    const candidate = await resolveCandidateForScoring(params.orgId, {
      entityType: topMatch.entityType,
      entityId: topMatch.entityId,
      matchedAmount: toAccountingNumber(topMatch.matchedAmount),
    });
    if (!candidate) {
      result.suggested++;
      continue;
    }

    const scored = scoreMatch(
      {
        bankAmount: toAccountingNumber(txn.amount),
        bankDate: txn.txnDate,
        bankReference: txn.reference,
        bankNormalizedPayee: txn.normalizedPayee,
        bankDescription: txn.description,
      },
      candidate,
    );

    if (scored.disposition === "AUTO_CONFIRM") {
      try {
        await confirmBankTransactionMatch({
          orgId: params.orgId,
          actorId: params.actorId,
          bankTransactionId: txn.id,
          matchId: topMatch.id,
        });
        result.autoConfirmed++;
      } catch (err) {
        result.errors.push({
          bankTxnId: txn.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
        result.suggested++;
      }
    } else {
      result.suggested++;
    }
  }

  return result;
}

interface CandidateForScoring {
  candidateAmount: number;
  candidateDate: Date | string;
  candidateReference?: string | null;
  candidatePartyName?: string | null;
  isSingleOpenDocForParty?: boolean;
}

async function resolveCandidateForScoring(
  orgId: string,
  match: {
    entityType: MatchEntityType;
    entityId: string;
    matchedAmount: number;
  },
): Promise<CandidateForScoring | null> {
  try {
    if (match.entityType === "INVOICE_PAYMENT") {
      const invoice = await db.invoice.findFirst({
        where: { id: match.entityId, organizationId: orgId },
        select: {
          invoiceDate: true,
          invoiceNumber: true,
          customer: { select: { name: true } },
        },
      });
      if (!invoice) return null;

      const openInvoiceCount = await db.invoice.count({
        where: {
          organizationId: orgId,
          customerId: (
            await db.invoice.findFirst({
              where: { id: match.entityId },
              select: { customerId: true },
            })
          )?.customerId ?? "",
          status: { in: ["ISSUED", "VIEWED", "DUE", "PARTIALLY_PAID", "OVERDUE"] },
        },
      });

      return {
        candidateAmount: match.matchedAmount,
        candidateDate: invoice.invoiceDate,
        candidateReference: invoice.invoiceNumber,
        candidatePartyName: invoice.customer?.name,
        isSingleOpenDocForParty: openInvoiceCount === 1,
      };
    }

    if (match.entityType === "VENDOR_BILL_PAYMENT") {
      const bill = await db.vendorBill.findFirst({
        where: { id: match.entityId, orgId },
        select: {
          billDate: true,
          billNumber: true,
          vendor: { select: { name: true } },
        },
      });
      if (!bill) return null;

      return {
        candidateAmount: match.matchedAmount,
        candidateDate: bill.billDate,
        candidateReference: bill.billNumber,
        candidatePartyName: bill.vendor?.name,
      };
    }

    // For other entity types, use the raw matched amount and no extra signals.
    return {
      candidateAmount: match.matchedAmount,
      candidateDate: new Date(),
    };
  } catch {
    return null;
  }
}

export interface EnrichedMatch {
  matchId: string;
  entityType: MatchEntityType;
  entityId: string;
  matchedAmount: number;
  confidenceScore: number | null;
  disposition: ReturnType<typeof getDisposition>;
  status: string;
  label: string;
  subLabel: string | null;
  documentDate: string | null;
}

/**
 * Return the top suggested matches for a given bank transaction, enriched
 * with entity display names and dates for the workbench UI.
 */
export async function getEnrichedSuggestedMatches(
  bankTxnId: string,
  orgId: string,
): Promise<EnrichedMatch[]> {
  const matches = await db.bankTransactionMatch.findMany({
    where: { bankTxnId, orgId, status: { in: ["SUGGESTED", "CONFIRMED"] } },
    orderBy: [{ status: "asc" }, { confidenceScore: "desc" }],
    take: 5,
  });

  return Promise.all(
    matches.map(async (m) => {
      const { label, subLabel, documentDate } = await resolveEntityLabel(orgId, m);
      return {
        matchId: m.id,
        entityType: m.entityType,
        entityId: m.entityId,
        matchedAmount: toAccountingNumber(m.matchedAmount),
        confidenceScore: m.confidenceScore,
        disposition: getDisposition(m.confidenceScore ?? 0),
        status: m.status,
        label,
        subLabel,
        documentDate,
      };
    }),
  );
}

async function resolveEntityLabel(
  orgId: string,
  match: { entityType: MatchEntityType; entityId: string },
): Promise<{ label: string; subLabel: string | null; documentDate: string | null }> {
  try {
    if (match.entityType === "INVOICE_PAYMENT") {
      const inv = await db.invoice.findFirst({
        where: { id: match.entityId, organizationId: orgId },
        select: {
          invoiceNumber: true,
          invoiceDate: true,
          customer: { select: { name: true } },
        },
      });
      if (inv) {
        return {
          label: inv.invoiceNumber,
          subLabel: inv.customer?.name ?? null,
          documentDate: formatIsoDate(inv.invoiceDate),
        };
      }
    }
    if (match.entityType === "VENDOR_BILL_PAYMENT") {
      const bill = await db.vendorBill.findFirst({
        where: { id: match.entityId, orgId },
        select: {
          billNumber: true,
          billDate: true,
          vendor: { select: { name: true } },
        },
      });
      if (bill) {
        return {
          label: bill.billNumber,
          subLabel: bill.vendor?.name ?? null,
          documentDate: formatIsoDate(bill.billDate),
        };
      }
    }
    if (match.entityType === "VOUCHER") {
      const voucher = await db.voucher.findFirst({
        where: { id: match.entityId, organizationId: orgId },
        select: { voucherNumber: true, voucherDate: true },
      });
      if (voucher) {
        return {
          label: voucher.voucherNumber,
          subLabel: "Voucher",
          documentDate: formatIsoDate(voucher.voucherDate),
        };
      }
    }
  } catch {
    // fall through to default
  }
  return { label: match.entityType.replace(/_/g, " "), subLabel: null, documentDate: null };
}
