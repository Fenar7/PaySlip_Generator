import "server-only";

import crypto from "node:crypto";
import Papa from "papaparse";
import { db } from "@/lib/db";
import type {
  BankAccountType,
  BankTxnStatus,
  BankTxnDirection,
  MatchEntityType,
  Prisma,
} from "@/generated/prisma/client";
import { incrementUsage } from "@/lib/plans/usage";
import {
  defaultNormalBalanceForType,
  ensureBooksSetup,
  ensureBooksSetupTx,
  getRequiredSystemAccountsTx,
  SYSTEM_ACCOUNT_KEYS,
} from "./accounts";
import { createAndPostJournalTx } from "./journals";
import { cleanText, parseAccountingDate, roundMoney } from "./utils";

type TxClient = Prisma.TransactionClient;

const MAX_STATEMENT_ROWS = 5000;
const MAX_STATEMENT_SIZE_BYTES = 2 * 1024 * 1024;
const AMOUNT_TOLERANCE = 0.01;

export interface BankStatementMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn?: string;
  creditColumn?: string;
  debitColumn?: string;
  directionColumn?: string;
  referenceColumn?: string;
  balanceColumn?: string;
  valueDateColumn?: string;
  payeeColumn?: string;
  dateFormat?: "DMY" | "MDY" | "YMD";
}

export interface FailedBankStatementRow {
  rowNumber: number;
  error: string;
  raw: Record<string, string>;
}

interface NormalizedBankStatementRow {
  rowNumber: number;
  txnDate: Date;
  valueDate: Date | null;
  direction: BankTxnDirection;
  amount: number;
  runningBalance: number | null;
  reference: string | null;
  description: string;
  normalizedPayee: string | null;
  normalizedType: string | null;
  fingerprint: string;
  rawPayload: Prisma.InputJsonValue;
}

interface BankMatchCandidate {
  entityType: MatchEntityType;
  entityId: string;
  matchedAmount: number;
  confidenceScore: number;
}

interface BankTransactionFilters {
  bankAccountId?: string;
  importId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

function normalizeString(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ").toUpperCase() ?? "";
}

function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseAmount(raw: string | null | undefined): number | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const negative = trimmed.startsWith("(") && trimmed.endsWith(")");
  const normalized = trimmed
    .replace(/[(),]/g, "")
    .replace(/[^0-9.+-]/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid amount "${raw}"`);
  }

  return roundMoney(negative ? -parsed : parsed);
}

function parseStatementDate(
  raw: string | null | undefined,
  formatHint?: BankStatementMapping["dateFormat"],
): Date {
  if (!raw) {
    throw new Error("Missing date");
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Missing date");
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return parseAccountingDate(trimmed);
  }

  const normalized = trimmed.replace(/\./g, "/").replace(/-/g, "/");
  const parts = normalized.split("/").map((part) => part.trim());
  if (parts.length === 3 && parts.every((part) => /^\d+$/.test(part))) {
    let year: number;
    let month: number;
    let day: number;

    if (formatHint === "YMD" || parts[0].length === 4) {
      year = Number(parts[0]);
      month = Number(parts[1]);
      day = Number(parts[2]);
    } else if (formatHint === "MDY") {
      month = Number(parts[0]);
      day = Number(parts[1]);
      year = Number(parts[2]);
    } else {
      day = Number(parts[0]);
      month = Number(parts[1]);
      year = Number(parts[2]);
    }

    if (year < 100) {
      year += 2000;
    }

    const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date "${raw}"`);
  }

  return parsed;
}

function classifyBankTransaction(description: string, reference?: string | null): string | null {
  const text = normalizeString(`${description} ${reference ?? ""}`);

  if (!text) {
    return null;
  }

  if (
    text.includes("CHARGE")
    || text.includes("FEE")
    || text.includes("COMMISSION")
  ) {
    return "BANK_FEE";
  }

  if (
    text.includes("RAZORPAY")
    || text.includes("SETTLEMENT")
    || text.includes("PG")
  ) {
    return "GATEWAY_SETTLEMENT";
  }

  if (
    text.includes("TRANSFER")
    || text.includes("UPI")
    || text.includes("IMPS")
    || text.includes("NEFT")
    || text.includes("RTGS")
    || text.includes("SELF")
  ) {
    return "TRANSFER";
  }

  return "GENERAL";
}

function calculateTextScore(haystack: string, needles: Array<string | null | undefined>): number {
  const normalizedHaystack = normalizeString(haystack);
  if (!normalizedHaystack) {
    return 0;
  }

  for (const needle of needles) {
    const normalizedNeedle = normalizeString(needle);
    if (normalizedNeedle && normalizedHaystack.includes(normalizedNeedle)) {
      return 15;
    }
  }

  return 0;
}

function scoreAmountMatch(bankAmount: number, candidateAmount: number): number {
  const diff = Math.abs(roundMoney(bankAmount - candidateAmount));
  if (diff <= AMOUNT_TOLERANCE) {
    return 55;
  }
  if (candidateAmount <= bankAmount + AMOUNT_TOLERANCE) {
    return 35;
  }
  return 0;
}

function scoreDateMatch(bankDate: Date, candidateDate: Date | string | null | undefined): number {
  if (!candidateDate) {
    return 0;
  }

  const candidate =
    candidateDate instanceof Date ? candidateDate : parseAccountingDate(candidateDate);
  const days = Math.abs(
    Math.round((candidate.getTime() - bankDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  if (days <= 1) {
    return 20;
  }
  if (days <= 3) {
    return 10;
  }
  if (days <= 7) {
    return 5;
  }
  return 0;
}

function buildStorageChecksum(content: string | Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function buildBankFingerprint(input: {
  txnDate: Date;
  amount: number;
  direction: BankTxnDirection;
  reference?: string | null;
  description: string;
}): string {
  return buildStorageChecksum(
    [
      input.txnDate.toISOString().slice(0, 10),
      input.direction,
      input.amount.toFixed(2),
      normalizeString(input.reference),
      normalizeString(input.description),
    ].join("|"),
  );
}

function ensureBankStatementHeaders(
  headers: string[] | undefined,
  mapping: BankStatementMapping,
) {
  const available = new Set((headers ?? []).map((header) => header.trim()));
  const required = [
    mapping.dateColumn,
    mapping.descriptionColumn,
    mapping.amountColumn,
    mapping.creditColumn,
    mapping.debitColumn,
    mapping.directionColumn,
    mapping.referenceColumn,
    mapping.balanceColumn,
    mapping.valueDateColumn,
    mapping.payeeColumn,
  ].filter((value): value is string => Boolean(value));

  for (const column of required) {
    if (!available.has(column)) {
      throw new Error(`Missing mapped CSV column "${column}".`);
    }
  }
}

function normalizeMapping(input: unknown): BankStatementMapping {
  if (!input || typeof input !== "object") {
    throw new Error("A bank statement column mapping is required.");
  }

  const mapping = input as Record<string, unknown>;
  const normalized: BankStatementMapping = {
    dateColumn: String(mapping.dateColumn ?? "").trim(),
    descriptionColumn: String(mapping.descriptionColumn ?? "").trim(),
    amountColumn: typeof mapping.amountColumn === "string" ? mapping.amountColumn.trim() : undefined,
    creditColumn: typeof mapping.creditColumn === "string" ? mapping.creditColumn.trim() : undefined,
    debitColumn: typeof mapping.debitColumn === "string" ? mapping.debitColumn.trim() : undefined,
    directionColumn:
      typeof mapping.directionColumn === "string" ? mapping.directionColumn.trim() : undefined,
    referenceColumn:
      typeof mapping.referenceColumn === "string" ? mapping.referenceColumn.trim() : undefined,
    balanceColumn:
      typeof mapping.balanceColumn === "string" ? mapping.balanceColumn.trim() : undefined,
    valueDateColumn:
      typeof mapping.valueDateColumn === "string" ? mapping.valueDateColumn.trim() : undefined,
    payeeColumn: typeof mapping.payeeColumn === "string" ? mapping.payeeColumn.trim() : undefined,
    dateFormat:
      mapping.dateFormat === "DMY" || mapping.dateFormat === "MDY" || mapping.dateFormat === "YMD"
        ? mapping.dateFormat
        : undefined,
  };

  if (!normalized.dateColumn || !normalized.descriptionColumn) {
    throw new Error("Date and description columns are required.");
  }

  if (!normalized.amountColumn && !(normalized.creditColumn && normalized.debitColumn)) {
    throw new Error(
      "Provide either a single amount column or both debit and credit columns.",
    );
  }

  return normalized;
}

function deriveDirectionAndAmount(
  row: Record<string, string>,
  mapping: BankStatementMapping,
): { direction: BankTxnDirection; amount: number } {
  if (mapping.creditColumn || mapping.debitColumn) {
    const credit = mapping.creditColumn ? parseAmount(row[mapping.creditColumn]) : null;
    const debit = mapping.debitColumn ? parseAmount(row[mapping.debitColumn]) : null;

    if ((credit ?? 0) > 0 && (debit ?? 0) > 0) {
      throw new Error("Both debit and credit amounts were populated.");
    }
    if ((credit ?? 0) > 0) {
      return { direction: "CREDIT", amount: Math.abs(credit ?? 0) };
    }
    if ((debit ?? 0) > 0) {
      return { direction: "DEBIT", amount: Math.abs(debit ?? 0) };
    }

    throw new Error("No amount found.");
  }

  const amount = parseAmount(row[mapping.amountColumn ?? ""]);
  if (amount === null) {
    throw new Error("No amount found.");
  }

  const directionText = normalizeString(
    mapping.directionColumn ? row[mapping.directionColumn] : undefined,
  );

  if (directionText === "DEBIT" || directionText === "DR") {
    return { direction: "DEBIT", amount: Math.abs(amount) };
  }
  if (directionText === "CREDIT" || directionText === "CR") {
    return { direction: "CREDIT", amount: Math.abs(amount) };
  }

  return amount < 0
    ? { direction: "DEBIT", amount: Math.abs(amount) }
    : { direction: "CREDIT", amount: Math.abs(amount) };
}

function normalizeStatementRow(
  row: Record<string, string>,
  rowNumber: number,
  mapping: BankStatementMapping,
): NormalizedBankStatementRow {
  const description = cleanText(row[mapping.descriptionColumn]);
  if (!description) {
    throw new Error("Description is required.");
  }

  const txnDate = parseStatementDate(row[mapping.dateColumn], mapping.dateFormat);
  const valueDate = mapping.valueDateColumn
    ? row[mapping.valueDateColumn]
      ? parseStatementDate(row[mapping.valueDateColumn], mapping.dateFormat)
      : null
    : null;
  const { direction, amount } = deriveDirectionAndAmount(row, mapping);
  const runningBalance = mapping.balanceColumn ? parseAmount(row[mapping.balanceColumn]) : null;
  const reference = cleanText(
    mapping.referenceColumn ? row[mapping.referenceColumn] : undefined,
  );
  const normalizedPayee = cleanText(
    mapping.payeeColumn ? row[mapping.payeeColumn] : undefined,
  );
  const normalizedType = classifyBankTransaction(description, reference);

  return {
    rowNumber,
    txnDate,
    valueDate,
    direction,
    amount: roundMoney(amount),
    runningBalance,
    reference,
    description,
    normalizedPayee,
    normalizedType,
    fingerprint: buildBankFingerprint({
      txnDate,
      amount,
      direction,
      reference,
      description,
    }),
    rawPayload: toJsonValue({ rowNumber, ...row }),
  };
}

function bankDateWindow(txnDate: Date, days: number) {
  return {
    gte: new Date(txnDate.getTime() - days * 24 * 60 * 60 * 1000),
    lte: new Date(txnDate.getTime() + days * 24 * 60 * 60 * 1000),
  };
}

function buildBankAccountGlCode(type: BankAccountType, sequence: number) {
  const prefix =
    type === "CASH"
      ? "CASH"
      : type === "PETTY_CASH"
        ? "PETTY"
        : type === "GATEWAY_CLEARING"
          ? "GCLR"
          : "BANK";

  return `${prefix}-${sequence.toString().padStart(3, "0")}`;
}

async function getConfirmedMatchedAmountForBankTxnTx(
  tx: TxClient,
  bankTxnId: string,
): Promise<number> {
  const aggregate = await tx.bankTransactionMatch.aggregate({
    where: { bankTxnId, status: "CONFIRMED" },
    _sum: { matchedAmount: true },
  });

  return roundMoney(aggregate._sum.matchedAmount ?? 0);
}

async function getConfirmedMatchedAmountForEntityTx(
  tx: TxClient,
  entityType: MatchEntityType,
  entityId: string,
): Promise<number> {
  const aggregate = await tx.bankTransactionMatch.aggregate({
    where: { entityType, entityId, status: "CONFIRMED" },
    _sum: { matchedAmount: true },
  });

  return roundMoney(aggregate._sum.matchedAmount ?? 0);
}

async function syncBankTransactionStatusTx(tx: TxClient, bankTxnId: string) {
  const bankTxn = await tx.bankTransaction.findUniqueOrThrow({
    where: { id: bankTxnId },
    select: {
      id: true,
      amount: true,
      status: true,
      matches: {
        select: { id: true, status: true, matchedAmount: true },
      },
    },
  });

  const confirmed = roundMoney(
    bankTxn.matches
      .filter((match) => match.status === "CONFIRMED")
      .reduce((sum, match) => sum + match.matchedAmount, 0),
  );
  const suggestedCount = bankTxn.matches.filter((match) => match.status === "SUGGESTED").length;

  let nextStatus = bankTxn.status;
  if (bankTxn.status === "IGNORED" && confirmed === 0) {
    nextStatus = "IGNORED";
  } else if (confirmed <= 0) {
    nextStatus = suggestedCount > 0 ? "SUGGESTED" : "UNMATCHED";
  } else if (confirmed + AMOUNT_TOLERANCE >= bankTxn.amount) {
    nextStatus = "MATCHED";
  } else {
    nextStatus = "PARTIALLY_MATCHED";
  }

  if (nextStatus !== bankTxn.status) {
    await tx.bankTransaction.update({
      where: { id: bankTxnId },
      data: { status: nextStatus },
    });
  }
}

async function scoreInvoicePaymentCandidatesTx(
  tx: TxClient,
  bankTxn: {
    orgId: string;
    amount: number;
    txnDate: Date;
    direction: BankTxnDirection;
    description: string;
    reference: string | null;
    normalizedType: string | null;
  },
): Promise<BankMatchCandidate[]> {
  if (bankTxn.direction !== "CREDIT") {
    return [];
  }

  const payments = await tx.invoicePayment.findMany({
    where: {
      orgId: bankTxn.orgId,
      status: "SETTLED",
      bankMatchId: null,
      amount: { lte: bankTxn.amount + AMOUNT_TOLERANCE },
      paidAt: bankDateWindow(bankTxn.txnDate, 7),
    },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
        },
      },
    },
    orderBy: [{ paidAt: "desc" }],
    take: 25,
  });

  const candidates: BankMatchCandidate[] = [];
  for (const payment of payments) {
    const alreadyMatched = await getConfirmedMatchedAmountForEntityTx(
      tx,
      "INVOICE_PAYMENT",
      payment.id,
    );

    if (alreadyMatched > 0) {
      continue;
    }

    const score =
      scoreAmountMatch(bankTxn.amount, payment.amount)
      + scoreDateMatch(bankTxn.txnDate, payment.paidAt)
      + calculateTextScore(`${bankTxn.description} ${bankTxn.reference ?? ""}`, [
        payment.invoice.invoiceNumber,
        payment.externalReferenceId,
        payment.externalPaymentId,
      ])
      + (bankTxn.normalizedType === "GATEWAY_SETTLEMENT" ? 10 : 0);

    if (score > 0) {
      candidates.push({
        entityType: "INVOICE_PAYMENT",
        entityId: payment.id,
        matchedAmount: roundMoney(payment.amount),
        confidenceScore: score,
      });
    }
  }

  return candidates;
}

async function scoreVoucherCandidatesTx(
  tx: TxClient,
  bankTxn: {
    orgId: string;
    amount: number;
    txnDate: Date;
    direction: BankTxnDirection;
    description: string;
    reference: string | null;
  },
): Promise<BankMatchCandidate[]> {
  const vouchers = await tx.voucher.findMany({
    where: {
      organizationId: bankTxn.orgId,
      archivedAt: null,
      status: "approved",
      accountingStatus: "POSTED",
      type: bankTxn.direction === "CREDIT" ? "receipt" : "payment",
      totalAmount: { lte: bankTxn.amount + AMOUNT_TOLERANCE },
      voucherDate: {
        gte: new Date(bankTxn.txnDate.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        lte: new Date(bankTxn.txnDate.getTime() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      },
    },
    include: {
      vendor: { select: { name: true } },
    },
    take: 25,
    orderBy: { createdAt: "desc" },
  });

  const candidates: BankMatchCandidate[] = [];
  for (const voucher of vouchers) {
    const alreadyMatched = await getConfirmedMatchedAmountForEntityTx(tx, "VOUCHER", voucher.id);
    const remaining = roundMoney(voucher.totalAmount - alreadyMatched);
    if (remaining <= 0) {
      continue;
    }

    const score =
      scoreAmountMatch(bankTxn.amount, remaining)
      + scoreDateMatch(bankTxn.txnDate, voucher.voucherDate)
      + calculateTextScore(`${bankTxn.description} ${bankTxn.reference ?? ""}`, [
        voucher.voucherNumber,
        voucher.vendor?.name,
      ]);

    if (score > 0) {
      candidates.push({
        entityType: "VOUCHER",
        entityId: voucher.id,
        matchedAmount: Math.min(roundMoney(remaining), bankTxn.amount),
        confidenceScore: score,
      });
    }
  }

  return candidates;
}

async function scoreJournalCandidatesTx(
  tx: TxClient,
  bankTxn: {
    orgId: string;
    amount: number;
    txnDate: Date;
    description: string;
    reference: string | null;
  },
): Promise<BankMatchCandidate[]> {
  const journals = await tx.journalEntry.findMany({
    where: {
      orgId: bankTxn.orgId,
      status: "POSTED",
      source: "MANUAL",
      entryDate: bankDateWindow(bankTxn.txnDate, 7),
      totalDebit: { lte: bankTxn.amount + AMOUNT_TOLERANCE },
    },
    take: 20,
    orderBy: { entryDate: "desc" },
  });

  const candidates: BankMatchCandidate[] = [];
  for (const journal of journals) {
    const alreadyMatched = await getConfirmedMatchedAmountForEntityTx(
      tx,
      "JOURNAL_ENTRY",
      journal.id,
    );
    const remaining = roundMoney(journal.totalDebit - alreadyMatched);
    if (remaining <= 0) {
      continue;
    }

    const score =
      scoreAmountMatch(bankTxn.amount, remaining)
      + scoreDateMatch(bankTxn.txnDate, journal.entryDate)
      + calculateTextScore(`${bankTxn.description} ${bankTxn.reference ?? ""}`, [
        journal.entryNumber,
        journal.memo,
        journal.sourceRef,
      ]);

    if (score > 0) {
      candidates.push({
        entityType: "JOURNAL_ENTRY",
        entityId: journal.id,
        matchedAmount: Math.min(remaining, bankTxn.amount),
        confidenceScore: score,
      });
    }
  }

  return candidates;
}

async function scoreInternalTransferCandidatesTx(
  tx: TxClient,
  bankTxn: {
    id: string;
    orgId: string;
    bankAccountId: string;
    amount: number;
    txnDate: Date;
    direction: BankTxnDirection;
    description: string;
    reference: string | null;
  },
): Promise<BankMatchCandidate[]> {
  const counterpartyTxns = await tx.bankTransaction.findMany({
    where: {
      orgId: bankTxn.orgId,
      id: { not: bankTxn.id },
      bankAccountId: { not: bankTxn.bankAccountId },
      direction: bankTxn.direction === "CREDIT" ? "DEBIT" : "CREDIT",
      amount: { gte: bankTxn.amount - AMOUNT_TOLERANCE, lte: bankTxn.amount + AMOUNT_TOLERANCE },
      txnDate: bankDateWindow(bankTxn.txnDate, 3),
    },
    take: 10,
    orderBy: { txnDate: "desc" },
  });

  const candidates: BankMatchCandidate[] = [];
  for (const counterparty of counterpartyTxns) {
    const matched = await getConfirmedMatchedAmountForEntityTx(
      tx,
      "INTERNAL_TRANSFER",
      counterparty.id,
    );
    if (matched > 0) {
      continue;
    }

    const score =
      scoreAmountMatch(bankTxn.amount, counterparty.amount)
      + scoreDateMatch(bankTxn.txnDate, counterparty.txnDate)
      + calculateTextScore(`${bankTxn.description} ${bankTxn.reference ?? ""}`, [
        counterparty.reference,
        counterparty.description,
      ])
      + 10;

    candidates.push({
      entityType: "INTERNAL_TRANSFER",
      entityId: counterparty.id,
      matchedAmount: bankTxn.amount,
      confidenceScore: score,
    });
  }

  return candidates;
}

function buildBankFeeCandidate(bankTxn: {
  id: string;
  amount: number;
  direction: BankTxnDirection;
  normalizedType: string | null;
}) {
  if (bankTxn.direction !== "DEBIT" || bankTxn.normalizedType !== "BANK_FEE") {
    return null;
  }

  return {
    entityType: "BANK_FEE" as const,
    entityId: bankTxn.id,
    matchedAmount: bankTxn.amount,
    confidenceScore: bankTxn.amount <= 1000 ? 95 : 75,
  };
}

async function regenerateSuggestionsForBankTransactionTx(
  tx: TxClient,
  input: { orgId: string; bankTransactionId: string },
) {
  const bankTxn = await tx.bankTransaction.findFirst({
    where: { id: input.bankTransactionId, orgId: input.orgId },
    select: {
      id: true,
      orgId: true,
      bankAccountId: true,
      txnDate: true,
      direction: true,
      amount: true,
      description: true,
      reference: true,
      normalizedType: true,
      status: true,
    },
  });

  if (!bankTxn || bankTxn.status === "IGNORED") {
    return [];
  }

  await tx.bankTransactionMatch.deleteMany({
    where: {
      bankTxnId: bankTxn.id,
      status: { in: ["SUGGESTED", "REJECTED"] },
    },
  });

  const [invoiceCandidates, voucherCandidates, journalCandidates, transferCandidates] =
    await Promise.all([
      scoreInvoicePaymentCandidatesTx(tx, bankTxn),
      scoreVoucherCandidatesTx(tx, bankTxn),
      scoreJournalCandidatesTx(tx, bankTxn),
      scoreInternalTransferCandidatesTx(tx, bankTxn),
    ]);

  const feeCandidate = buildBankFeeCandidate(bankTxn);
  const candidates = [
    ...invoiceCandidates,
    ...voucherCandidates,
    ...journalCandidates,
    ...transferCandidates,
    ...(feeCandidate ? [feeCandidate] : []),
  ]
    .filter((candidate) => candidate.confidenceScore > 0)
    .sort((left, right) => right.confidenceScore - left.confidenceScore)
    .slice(0, 8);

  if (candidates.length > 0) {
    await tx.bankTransactionMatch.createMany({
      data: candidates.map((candidate) => ({
        orgId: input.orgId,
        bankTxnId: bankTxn.id,
        entityType: candidate.entityType,
        entityId: candidate.entityId,
        matchedAmount: candidate.matchedAmount,
        confidenceScore: candidate.confidenceScore,
        status: "SUGGESTED",
      })),
      skipDuplicates: true,
    });
  }

  await syncBankTransactionStatusTx(tx, bankTxn.id);

  return candidates;
}

function buildBankingWhere(orgId: string, filters: BankTransactionFilters): Prisma.BankTransactionWhereInput {
  return {
    orgId,
    ...(filters.bankAccountId ? { bankAccountId: filters.bankAccountId } : {}),
    ...(filters.importId ? { importId: filters.importId } : {}),
    ...(filters.status ? { status: filters.status as BankTxnStatus } : {}),
    ...(filters.startDate || filters.endDate
      ? {
          txnDate: {
            ...(filters.startDate ? { gte: parseAccountingDate(filters.startDate) } : {}),
            ...(filters.endDate ? { lte: parseAccountingDate(filters.endDate) } : {}),
          },
        }
      : {}),
    ...(filters.minAmount !== undefined || filters.maxAmount !== undefined
      ? {
          amount: {
            ...(filters.minAmount !== undefined ? { gte: filters.minAmount } : {}),
            ...(filters.maxAmount !== undefined ? { lte: filters.maxAmount } : {}),
          },
        }
      : {}),
  };
}

async function resolveMatchEntityAvailableAmountTx(
  tx: TxClient,
  match: { entityType: MatchEntityType; entityId: string },
): Promise<number> {
  switch (match.entityType) {
    case "INVOICE_PAYMENT": {
      const payment = await tx.invoicePayment.findUnique({
        where: { id: match.entityId },
        select: { id: true, amount: true, bankMatchId: true },
      });
      if (!payment) {
        throw new Error("Invoice payment not found.");
      }
      const alreadyMatched = await getConfirmedMatchedAmountForEntityTx(
        tx,
        "INVOICE_PAYMENT",
        payment.id,
      );
      return roundMoney(payment.amount - alreadyMatched);
    }
    case "VOUCHER": {
      const voucher = await tx.voucher.findUnique({
        where: { id: match.entityId },
        select: { totalAmount: true },
      });
      if (!voucher) {
        throw new Error("Voucher not found.");
      }
      const alreadyMatched = await getConfirmedMatchedAmountForEntityTx(tx, "VOUCHER", match.entityId);
      return roundMoney(voucher.totalAmount - alreadyMatched);
    }
    case "JOURNAL_ENTRY": {
      const journal = await tx.journalEntry.findUnique({
        where: { id: match.entityId },
        select: { totalDebit: true },
      });
      if (!journal) {
        throw new Error("Journal entry not found.");
      }
      const alreadyMatched = await getConfirmedMatchedAmountForEntityTx(
        tx,
        "JOURNAL_ENTRY",
        match.entityId,
      );
      return roundMoney(journal.totalDebit - alreadyMatched);
    }
    case "INTERNAL_TRANSFER": {
      const bankTxn = await tx.bankTransaction.findUnique({
        where: { id: match.entityId },
        select: { amount: true },
      });
      if (!bankTxn) {
        throw new Error("Counterparty bank transaction not found.");
      }
      const alreadyMatched = await getConfirmedMatchedAmountForEntityTx(
        tx,
        "INTERNAL_TRANSFER",
        match.entityId,
      );
      return roundMoney(bankTxn.amount - alreadyMatched);
    }
    case "BANK_FEE":
      return Number.MAX_SAFE_INTEGER;
  }

  throw new Error(`Unsupported bank match entity type: ${match.entityType}`);
}

async function createClearingSettlementJournalTx(
  tx: TxClient,
  input: {
    orgId: string;
    bankTxnId: string;
    actorId: string;
    bankAccountId: string;
    bankGlAccountId: string;
    clearingAccountId: string;
    amount: number;
    entryDate: Date;
    memo: string;
    sourceRef?: string | null;
  },
) {
  return createAndPostJournalTx(tx, {
    orgId: input.orgId,
    source: "BANK_RECONCILIATION",
    sourceId: input.bankTxnId,
    sourceRef: cleanText(input.sourceRef),
    entryDate: input.entryDate,
    actorId: input.actorId,
    memo: input.memo,
    lines: [
      {
        accountId: input.bankGlAccountId,
        debit: roundMoney(input.amount),
        description: input.memo,
        entityType: "bank_transaction",
        entityId: input.bankTxnId,
        bankTransactionId: input.bankTxnId,
      },
      {
        accountId: input.clearingAccountId,
        credit: roundMoney(input.amount),
        description: input.memo,
        entityType: "bank_transaction",
        entityId: input.bankTxnId,
        bankTransactionId: input.bankTxnId,
      },
    ],
  });
}

async function createClearingDisbursementSettlementJournalTx(
  tx: TxClient,
  input: {
    orgId: string;
    bankTxnId: string;
    actorId: string;
    bankGlAccountId: string;
    clearingAccountId: string;
    amount: number;
    entryDate: Date;
    memo: string;
    sourceRef?: string | null;
  },
) {
  return createAndPostJournalTx(tx, {
    orgId: input.orgId,
    source: "BANK_RECONCILIATION",
    sourceId: input.bankTxnId,
    sourceRef: cleanText(input.sourceRef),
    entryDate: input.entryDate,
    actorId: input.actorId,
    memo: input.memo,
    lines: [
      {
        accountId: input.clearingAccountId,
        debit: roundMoney(input.amount),
        description: input.memo,
        entityType: "bank_transaction",
        entityId: input.bankTxnId,
        bankTransactionId: input.bankTxnId,
      },
      {
        accountId: input.bankGlAccountId,
        credit: roundMoney(input.amount),
        description: input.memo,
        entityType: "bank_transaction",
        entityId: input.bankTxnId,
        bankTransactionId: input.bankTxnId,
      },
    ],
  });
}

async function createBankFeeJournalTx(
  tx: TxClient,
  input: {
    orgId: string;
    bankTxnId: string;
    actorId: string;
    bankGlAccountId: string;
    amount: number;
    entryDate: Date;
    memo: string;
  },
) {
  const accounts = await getRequiredSystemAccountsTx(tx, input.orgId, [
    SYSTEM_ACCOUNT_KEYS.BANK_CHARGES,
  ]);

  return createAndPostJournalTx(tx, {
    orgId: input.orgId,
    source: "BANK_RECONCILIATION",
    sourceId: input.bankTxnId,
    sourceRef: "BANK_FEE",
    entryDate: input.entryDate,
    actorId: input.actorId,
    memo: input.memo,
    lines: [
      {
        accountId: accounts[SYSTEM_ACCOUNT_KEYS.BANK_CHARGES].id,
        debit: roundMoney(input.amount),
        description: input.memo,
        entityType: "bank_transaction",
        entityId: input.bankTxnId,
        bankTransactionId: input.bankTxnId,
      },
      {
        accountId: input.bankGlAccountId,
        credit: roundMoney(input.amount),
        description: input.memo,
        entityType: "bank_transaction",
        entityId: input.bankTxnId,
        bankTransactionId: input.bankTxnId,
      },
    ],
  });
}

async function createInternalTransferJournalTx(
  tx: TxClient,
  input: {
    orgId: string;
    actorId: string;
    sourceTxnId: string;
    targetTxnId: string;
    sourceAccountId: string;
    targetAccountId: string;
    amount: number;
    entryDate: Date;
  },
) {
  return createAndPostJournalTx(tx, {
    orgId: input.orgId,
    source: "BANK_RECONCILIATION",
    sourceId: input.sourceTxnId,
    sourceRef: "INTERNAL_TRANSFER",
    entryDate: input.entryDate,
    actorId: input.actorId,
    memo: "Internal transfer reconciliation",
    lines: [
      {
        accountId: input.targetAccountId,
        debit: roundMoney(input.amount),
        description: "Internal transfer receipt",
        entityType: "bank_transaction",
        entityId: input.targetTxnId,
        bankTransactionId: input.targetTxnId,
      },
      {
        accountId: input.sourceAccountId,
        credit: roundMoney(input.amount),
        description: "Internal transfer source",
        entityType: "bank_transaction",
        entityId: input.sourceTxnId,
        bankTransactionId: input.sourceTxnId,
      },
    ],
  });
}

export async function listBankAccounts(orgId: string) {
  await ensureBooksSetup(orgId);

  const accounts = await db.bankAccount.findMany({
    where: { orgId },
    include: {
      glAccount: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      statementImports: {
        select: { id: true },
      },
      transactions: {
        where: { status: { in: ["UNMATCHED", "SUGGESTED", "PARTIALLY_MATCHED"] } },
        select: { id: true },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });

  return accounts.map((account) => ({
    ...account,
    importCount: account.statementImports.length,
    pendingTxnCount: account.transactions.length,
  }));
}

export async function createBankAccount(input: {
  orgId: string;
  actorId: string;
  name: string;
  type: BankAccountType;
  bankName?: string | null;
  maskedAccountNo?: string | null;
  ifscOrSwift?: string | null;
  currency?: string | null;
  openingBalance?: number;
  openingBalanceDate?: string | Date | null;
  isPrimary?: boolean;
  gatewayClearingAccountId?: string | null;
}) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Bank account name is required.");
  }

  return db.$transaction(async (tx) => {
    await ensureBooksSetupTx(tx, input.orgId);

    const systemAccounts = await getRequiredSystemAccountsTx(tx, input.orgId, [
      SYSTEM_ACCOUNT_KEYS.ASSETS_ROOT,
      SYSTEM_ACCOUNT_KEYS.CASH_ON_HAND,
      SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK,
      SYSTEM_ACCOUNT_KEYS.PAYMENT_GATEWAY_CLEARING,
      SYSTEM_ACCOUNT_KEYS.OPENING_BALANCE_EQUITY,
    ]);

    const bankAccountCount = await tx.bankAccount.count({ where: { orgId: input.orgId } });
    const glAccount = await tx.glAccount.create({
      data: {
        orgId: input.orgId,
        code: buildBankAccountGlCode(input.type, bankAccountCount + 1),
        name,
        accountType: "ASSET",
        normalBalance: defaultNormalBalanceForType("ASSET"),
        parentId:
          input.type === "CASH" || input.type === "PETTY_CASH"
            ? systemAccounts[SYSTEM_ACCOUNT_KEYS.CASH_ON_HAND].id
            : input.type === "GATEWAY_CLEARING"
              ? systemAccounts[SYSTEM_ACCOUNT_KEYS.PAYMENT_GATEWAY_CLEARING].id
              : systemAccounts[SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK].id,
        isSystem: false,
        isProtected: false,
        allowManualEntries: true,
      },
    });

    const makePrimary = input.isPrimary || bankAccountCount === 0;
    if (makePrimary) {
      await tx.bankAccount.updateMany({
        where: { orgId: input.orgId },
        data: { isPrimary: false },
      });
    }

    const bankAccount = await tx.bankAccount.create({
      data: {
        orgId: input.orgId,
        glAccountId: glAccount.id,
        gatewayClearingAccountId: input.gatewayClearingAccountId ?? undefined,
        type: input.type,
        name,
        bankName: cleanText(input.bankName),
        maskedAccountNo: cleanText(input.maskedAccountNo),
        ifscOrSwift: cleanText(input.ifscOrSwift),
        currency: cleanText(input.currency) ?? "INR",
        openingBalance: roundMoney(input.openingBalance ?? 0),
        openingBalanceDate: input.openingBalanceDate
          ? parseAccountingDate(input.openingBalanceDate)
          : undefined,
        isPrimary: makePrimary,
      },
    });

    if ((input.openingBalance ?? 0) !== 0) {
      const openingAmount = roundMoney(Math.abs(input.openingBalance ?? 0));
      const journal = await createAndPostJournalTx(tx, {
        orgId: input.orgId,
        source: "OPENING_BALANCE",
        sourceId: bankAccount.id,
        sourceRef: name,
        entryDate:
          input.openingBalanceDate
            ? parseAccountingDate(input.openingBalanceDate)
            : new Date(),
        actorId: input.actorId,
        memo: `Opening balance for ${name}`,
        lines:
          (input.openingBalance ?? 0) >= 0
            ? [
                {
                  accountId: glAccount.id,
                  debit: openingAmount,
                  description: `Opening balance for ${name}`,
                  entityType: "bank_account",
                  entityId: bankAccount.id,
                },
                {
                  accountId: systemAccounts[SYSTEM_ACCOUNT_KEYS.OPENING_BALANCE_EQUITY].id,
                  credit: openingAmount,
                  description: `Opening balance for ${name}`,
                  entityType: "bank_account",
                  entityId: bankAccount.id,
                },
              ]
            : [
                {
                  accountId: systemAccounts[SYSTEM_ACCOUNT_KEYS.OPENING_BALANCE_EQUITY].id,
                  debit: openingAmount,
                  description: `Opening balance for ${name}`,
                  entityType: "bank_account",
                  entityId: bankAccount.id,
                },
                {
                  accountId: glAccount.id,
                  credit: openingAmount,
                  description: `Opening balance for ${name}`,
                  entityType: "bank_account",
                  entityId: bankAccount.id,
                },
              ],
      });

      await tx.bankAccount.update({
        where: { id: bankAccount.id },
        data: { openingJournalEntryId: journal.id },
      });
    }

    if (makePrimary) {
      await tx.orgDefaults.update({
        where: { organizationId: input.orgId },
        data: { defaultBankAccountId: glAccount.id },
      });
    }

    await tx.auditLog.create({
      data: {
        orgId: input.orgId,
        actorId: input.actorId,
        action: "books.bank_account.created",
        entityType: "bank_account",
        entityId: bankAccount.id,
        metadata: {
          name,
          type: input.type,
          glAccountId: glAccount.id,
          isPrimary: makePrimary,
        },
      },
    });

    return bankAccount;
  });
}

export function generateBankStatementStoragePath(
  orgId: string,
  bankAccountId: string,
  fileName: string,
) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${orgId}/bank_statement/${bankAccountId}/${Date.now()}_${safeName}`;
}

export async function importBankStatement(input: {
  orgId: string;
  actorId: string;
  bankAccountId: string;
  fileName: string;
  storageKey: string;
  checksum: string;
  csvText: string;
  mapping: unknown;
}) {
  const mapping = normalizeMapping(input.mapping);

  if (Buffer.byteLength(input.csvText, "utf8") > MAX_STATEMENT_SIZE_BYTES) {
    throw new Error("CSV file exceeds the 2 MB size limit.");
  }

  const parsed = Papa.parse<Record<string, string>>(input.csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  ensureBankStatementHeaders(parsed.meta.fields, mapping);

  if (parsed.data.length > MAX_STATEMENT_ROWS) {
    throw new Error(`CSV exceeds the ${MAX_STATEMENT_ROWS} row import limit.`);
  }

  const normalizedRows: NormalizedBankStatementRow[] = [];
  const failedRows: FailedBankStatementRow[] = [];
  const seenFingerprints = new Set<string>();

  for (const [index, row] of parsed.data.entries()) {
    try {
      const normalized = normalizeStatementRow(row, index + 2, mapping);
      if (seenFingerprints.has(normalized.fingerprint)) {
        throw new Error("Duplicate row within the uploaded file.");
      }
      seenFingerprints.add(normalized.fingerprint);
      normalizedRows.push(normalized);
    } catch (error) {
      failedRows.push({
        rowNumber: index + 2,
        error: error instanceof Error ? error.message : "Invalid row",
        raw: row,
      });
    }
  }

  const result = await db.$transaction(async (tx) => {
    await ensureBooksSetupTx(tx, input.orgId);

    const bankAccount = await tx.bankAccount.findFirst({
      where: { id: input.bankAccountId, orgId: input.orgId, isActive: true },
      select: {
        id: true,
        glAccountId: true,
        mappingProfile: true,
      },
    });

    if (!bankAccount) {
      throw new Error("Bank account not found.");
    }

    const existingImport = await tx.bankStatementImport.findFirst({
      where: {
        orgId: input.orgId,
        bankAccountId: input.bankAccountId,
        checksum: input.checksum,
      },
      select: { id: true },
    });

    if (existingImport) {
      throw new Error("This statement has already been imported for the selected bank account.");
    }

    const importRecord = await tx.bankStatementImport.create({
      data: {
        orgId: input.orgId,
        bankAccountId: input.bankAccountId,
        fileName: input.fileName,
        storageKey: input.storageKey,
        checksum: input.checksum,
        status: "PROCESSING",
        mappingProfile: toJsonValue(mapping),
        uploadedByUserId: input.actorId,
      },
    });

    await tx.bankAccount.update({
      where: { id: input.bankAccountId },
      data: { mappingProfile: toJsonValue(mapping) },
    });

    const existingFingerprints = await tx.bankTransaction.findMany({
      where: {
        orgId: input.orgId,
        bankAccountId: input.bankAccountId,
        fingerprint: { in: normalizedRows.map((row) => row.fingerprint) },
      },
      select: { fingerprint: true },
    });
    const existingFingerprintSet = new Set(existingFingerprints.map((row) => row.fingerprint));

    const rowsToInsert: NormalizedBankStatementRow[] = [];
    for (const row of normalizedRows) {
      if (existingFingerprintSet.has(row.fingerprint)) {
        failedRows.push({
          rowNumber: row.rowNumber,
          error: "Duplicate transaction already exists for this bank account.",
          raw: row.rawPayload as Record<string, string>,
        });
        continue;
      }
      rowsToInsert.push(row);
    }

    if (rowsToInsert.length > 0) {
      await tx.bankTransaction.createMany({
        data: rowsToInsert.map((row) => ({
          orgId: input.orgId,
          bankAccountId: input.bankAccountId,
          importId: importRecord.id,
          txnDate: row.txnDate,
          valueDate: row.valueDate ?? undefined,
          direction: row.direction,
          amount: row.amount,
          runningBalance: row.runningBalance ?? undefined,
          reference: row.reference,
          description: row.description,
          normalizedPayee: row.normalizedPayee,
          normalizedType: row.normalizedType,
          fingerprint: row.fingerprint,
          rawPayload: row.rawPayload,
        })),
      });
    }

    const createdTransactions = await tx.bankTransaction.findMany({
      where: { importId: importRecord.id },
      select: { id: true },
    });

    for (const transaction of createdTransactions) {
      await regenerateSuggestionsForBankTransactionTx(tx, {
        orgId: input.orgId,
        bankTransactionId: transaction.id,
      });
    }

    const statementStart =
      rowsToInsert.length > 0
        ? rowsToInsert.reduce(
            (min, row) => (row.txnDate < min ? row.txnDate : min),
            rowsToInsert[0].txnDate,
          )
        : undefined;
    const statementEnd =
      rowsToInsert.length > 0
        ? rowsToInsert.reduce(
            (max, row) => (row.txnDate > max ? row.txnDate : max),
            rowsToInsert[0].txnDate,
          )
        : undefined;

    await tx.bankStatementImport.update({
      where: { id: importRecord.id },
      data: {
        status: rowsToInsert.length > 0 ? "PROCESSED" : "FAILED",
        importedRows: rowsToInsert.length,
        failedRows: failedRows.length,
        errorRows: failedRows.length > 0 ? toJsonValue(failedRows) : undefined,
        statementStart,
        statementEnd,
        completedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        orgId: input.orgId,
        actorId: input.actorId,
        action: "books.bank.imported",
        entityType: "bank_statement_import",
        entityId: importRecord.id,
        metadata: {
          bankAccountId: input.bankAccountId,
          importedRows: rowsToInsert.length,
          failedRows: failedRows.length,
          checksum: input.checksum,
        },
      },
    });

    return {
      importId: importRecord.id,
      importedRows: rowsToInsert.length,
      failedRows,
      transactionCount: createdTransactions.length,
    };
  });

  await incrementUsage(input.orgId, "statementImportsPerMonth");
  return result;
}

export async function listBankStatementImports(
  orgId: string,
  filters: { bankAccountId?: string } = {},
) {
  return db.bankStatementImport.findMany({
    where: {
      orgId,
      ...(filters.bankAccountId ? { bankAccountId: filters.bankAccountId } : {}),
    },
    include: {
      bankAccount: {
        select: {
          id: true,
          name: true,
        },
      },
      transactions: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBankStatementImportDetail(orgId: string, importId: string) {
  return db.bankStatementImport.findFirst({
    where: { id: importId, orgId },
    include: {
      bankAccount: {
        select: {
          id: true,
          name: true,
          bankName: true,
        },
      },
      transactions: {
        include: {
          matches: {
            orderBy: [{ status: "asc" }, { confidenceScore: "desc" }],
          },
        },
        orderBy: [{ txnDate: "desc" }, { createdAt: "desc" }],
      },
    },
  });
}

export async function getReconciliationWorkspace(
  orgId: string,
  filters: BankTransactionFilters = {},
) {
  const [bankAccounts, transactions, importHistory, manualAccounts] = await Promise.all([
    listBankAccounts(orgId),
    db.bankTransaction.findMany({
      where: buildBankingWhere(orgId, filters),
      include: {
        bankAccount: {
          select: {
            id: true,
            name: true,
            glAccountId: true,
          },
        },
        import: {
          select: {
            id: true,
            fileName: true,
            createdAt: true,
          },
        },
        matches: {
          orderBy: [{ status: "asc" }, { confidenceScore: "desc" }],
        },
      },
      orderBy: [{ txnDate: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    listBankStatementImports(orgId, {
      bankAccountId: filters.bankAccountId,
    }),
    db.glAccount.findMany({
      where: { orgId, isActive: true, allowManualEntries: true },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: [{ code: "asc" }],
    }),
  ]);

  return {
    bankAccounts,
    transactions,
    importHistory,
    manualAccounts,
  };
}

export async function refreshReconciliationSuggestions(
  orgId: string,
  filters: { bankAccountId?: string; importId?: string } = {},
) {
  const transactions = await db.bankTransaction.findMany({
    where: {
      orgId,
      status: { in: ["UNMATCHED", "SUGGESTED", "PARTIALLY_MATCHED"] },
      ...(filters.bankAccountId ? { bankAccountId: filters.bankAccountId } : {}),
      ...(filters.importId ? { importId: filters.importId } : {}),
    },
    select: { id: true },
    orderBy: { txnDate: "desc" },
  });

  for (const transaction of transactions) {
    await db.$transaction((tx) =>
      regenerateSuggestionsForBankTransactionTx(tx, {
        orgId,
        bankTransactionId: transaction.id,
      }),
    );
  }

  return { refreshed: transactions.length };
}

export async function confirmBankTransactionMatch(input: {
  orgId: string;
  actorId: string;
  bankTransactionId: string;
  matchId: string;
  matchedAmount?: number;
}) {
  return db.$transaction(async (tx) => {
    const bankTxn = await tx.bankTransaction.findFirst({
      where: { id: input.bankTransactionId, orgId: input.orgId },
      include: {
        bankAccount: {
          select: {
            id: true,
            name: true,
            glAccountId: true,
            gatewayClearingAccountId: true,
          },
        },
      },
    });

    if (!bankTxn) {
      throw new Error("Bank transaction not found.");
    }

    const match = await tx.bankTransactionMatch.findFirst({
      where: {
        id: input.matchId,
        bankTxnId: input.bankTransactionId,
        orgId: input.orgId,
      },
    });

    if (!match) {
      throw new Error("Reconciliation suggestion not found.");
    }

    if (match.status === "CONFIRMED") {
      return match;
    }

    const confirmedAmount = await getConfirmedMatchedAmountForBankTxnTx(tx, bankTxn.id);
    const remainingTxnAmount = roundMoney(bankTxn.amount - confirmedAmount);
    if (remainingTxnAmount <= 0) {
      throw new Error("This bank transaction is already fully matched.");
    }

    const matchedAmount = roundMoney(input.matchedAmount ?? match.matchedAmount);
    if (matchedAmount <= 0) {
      throw new Error("Matched amount must be greater than zero.");
    }
    if (matchedAmount > remainingTxnAmount + AMOUNT_TOLERANCE) {
      throw new Error("Matched amount exceeds the remaining bank transaction amount.");
    }

    const entityAvailable = await resolveMatchEntityAvailableAmountTx(tx, {
      entityType: match.entityType,
      entityId: match.entityId,
    });
    if (matchedAmount > entityAvailable + AMOUNT_TOLERANCE) {
      throw new Error("Matched amount exceeds the available amount for the selected entity.");
    }

    const updatedMatch = await tx.bankTransactionMatch.update({
      where: { id: match.id },
      data: {
        matchedAmount,
        status: "CONFIRMED",
        confirmedAt: new Date(),
        createdByUserId: match.createdByUserId ?? input.actorId,
      },
    });

    if (match.entityType === "INVOICE_PAYMENT") {
      const payment = await tx.invoicePayment.findUnique({
        where: { id: match.entityId },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
            },
          },
        },
      });

      if (!payment) {
        throw new Error("Invoice payment not found.");
      }

      if (payment.clearingAccountId && payment.clearingAccountId !== bankTxn.bankAccount.glAccountId) {
        await createClearingSettlementJournalTx(tx, {
          orgId: input.orgId,
          bankTxnId: bankTxn.id,
          actorId: input.actorId,
          bankAccountId: bankTxn.bankAccount.id,
          bankGlAccountId: bankTxn.bankAccount.glAccountId,
          clearingAccountId: payment.clearingAccountId,
          amount: matchedAmount,
          entryDate: bankTxn.txnDate,
          memo: `Clearing settlement for invoice ${payment.invoice.invoiceNumber}`,
          sourceRef: payment.invoice.invoiceNumber,
        });
      }

      await tx.invoicePayment.update({
        where: { id: payment.id },
        data: {
          bankMatchId: updatedMatch.id,
        },
      });
    } else if (match.entityType === "BANK_FEE") {
      await createBankFeeJournalTx(tx, {
        orgId: input.orgId,
        bankTxnId: bankTxn.id,
        actorId: input.actorId,
        bankGlAccountId: bankTxn.bankAccount.glAccountId,
        amount: matchedAmount,
        entryDate: bankTxn.txnDate,
        memo: `Bank fee reconciliation for ${bankTxn.bankAccount.name}`,
      });
    } else if (match.entityType === "INTERNAL_TRANSFER") {
      const counterparty = await tx.bankTransaction.findUnique({
        where: { id: match.entityId },
        include: {
          bankAccount: {
            select: {
              glAccountId: true,
            },
          },
        },
      });

      if (!counterparty) {
        throw new Error("Counterparty bank transaction not found.");
      }

      await createInternalTransferJournalTx(tx, {
        orgId: input.orgId,
        actorId: input.actorId,
        sourceTxnId:
          bankTxn.direction === "DEBIT" ? bankTxn.id : counterparty.id,
        targetTxnId:
          bankTxn.direction === "CREDIT" ? bankTxn.id : counterparty.id,
        sourceAccountId:
          bankTxn.direction === "DEBIT"
            ? bankTxn.bankAccount.glAccountId
            : counterparty.bankAccount.glAccountId,
        targetAccountId:
          bankTxn.direction === "CREDIT"
            ? bankTxn.bankAccount.glAccountId
            : counterparty.bankAccount.glAccountId,
        amount: matchedAmount,
        entryDate: bankTxn.txnDate > counterparty.txnDate ? bankTxn.txnDate : counterparty.txnDate,
      });

      await tx.bankTransactionMatch.upsert({
        where: {
          bankTxnId_entityType_entityId: {
            bankTxnId: counterparty.id,
            entityType: "INTERNAL_TRANSFER",
            entityId: bankTxn.id,
          },
        },
        create: {
          orgId: input.orgId,
          bankTxnId: counterparty.id,
          entityType: "INTERNAL_TRANSFER",
          entityId: bankTxn.id,
          matchedAmount,
          confidenceScore: updatedMatch.confidenceScore,
          status: "CONFIRMED",
          createdByUserId: input.actorId,
          confirmedAt: new Date(),
        },
        update: {
          matchedAmount,
          confidenceScore: updatedMatch.confidenceScore,
          status: "CONFIRMED",
          createdByUserId: input.actorId,
          confirmedAt: new Date(),
        },
      });

      await syncBankTransactionStatusTx(tx, counterparty.id);
    }

    await tx.auditLog.create({
      data: {
        orgId: input.orgId,
        actorId: input.actorId,
        action: "books.reconciliation.confirmed",
        entityType: "bank_transaction",
        entityId: bankTxn.id,
        metadata: {
          matchId: updatedMatch.id,
          entityType: updatedMatch.entityType,
          entityId: updatedMatch.entityId,
          matchedAmount,
        },
      },
    });

    await syncBankTransactionStatusTx(tx, bankTxn.id);

    return updatedMatch;
  });
}

export async function rejectBankTransactionMatch(input: {
  orgId: string;
  actorId: string;
  bankTransactionId: string;
  matchId: string;
}) {
  return db.$transaction(async (tx) => {
    const match = await tx.bankTransactionMatch.findFirst({
      where: {
        id: input.matchId,
        bankTxnId: input.bankTransactionId,
        orgId: input.orgId,
      },
    });

    if (!match) {
      throw new Error("Reconciliation suggestion not found.");
    }

    if (match.status === "CONFIRMED") {
      throw new Error("Confirmed matches cannot be rejected.");
    }

    const updated = await tx.bankTransactionMatch.update({
      where: { id: match.id },
      data: { status: "REJECTED" },
    });

    await syncBankTransactionStatusTx(tx, input.bankTransactionId);
    return updated;
  });
}

export async function ignoreBankTransaction(input: {
  orgId: string;
  actorId: string;
  bankTransactionId: string;
}) {
  return db.$transaction(async (tx) => {
    const bankTxn = await tx.bankTransaction.findFirst({
      where: { id: input.bankTransactionId, orgId: input.orgId },
      select: { id: true },
    });

    if (!bankTxn) {
      throw new Error("Bank transaction not found.");
    }

    const confirmedAmount = await getConfirmedMatchedAmountForBankTxnTx(tx, bankTxn.id);
    if (confirmedAmount > 0) {
      throw new Error("Matched bank transactions cannot be ignored.");
    }

    await tx.bankTransaction.update({
      where: { id: bankTxn.id },
      data: { status: "IGNORED" },
    });

    await tx.bankTransactionMatch.updateMany({
      where: {
        bankTxnId: bankTxn.id,
        status: "SUGGESTED",
      },
      data: { status: "IGNORED" },
    });

    return bankTxn;
  });
}

export async function createAdjustingJournalFromBankTransaction(input: {
  orgId: string;
  actorId: string;
  bankTransactionId: string;
  offsetAccountId: string;
  memo?: string | null;
}) {
  return db.$transaction(async (tx) => {
    const bankTxn = await tx.bankTransaction.findFirst({
      where: { id: input.bankTransactionId, orgId: input.orgId },
      include: {
        bankAccount: {
          select: {
            id: true,
            name: true,
            glAccountId: true,
          },
        },
      },
    });

    if (!bankTxn) {
      throw new Error("Bank transaction not found.");
    }

    const confirmedAmount = await getConfirmedMatchedAmountForBankTxnTx(tx, bankTxn.id);
    const remainingAmount = roundMoney(bankTxn.amount - confirmedAmount);
    if (remainingAmount <= 0) {
      throw new Error("This bank transaction is already fully matched.");
    }

    const journal = await createAndPostJournalTx(tx, {
      orgId: input.orgId,
      source: "BANK_RECONCILIATION",
      sourceId: bankTxn.id,
      sourceRef: bankTxn.reference ?? bankTxn.id,
      entryDate: bankTxn.txnDate,
      actorId: input.actorId,
      memo: cleanText(input.memo) ?? `Adjusting journal for ${bankTxn.bankAccount.name}`,
      lines:
        bankTxn.direction === "CREDIT"
          ? [
              {
                accountId: bankTxn.bankAccount.glAccountId,
                debit: remainingAmount,
                description: bankTxn.description,
                entityType: "bank_transaction",
                entityId: bankTxn.id,
                bankTransactionId: bankTxn.id,
              },
              {
                accountId: input.offsetAccountId,
                credit: remainingAmount,
                description: bankTxn.description,
                entityType: "bank_transaction",
                entityId: bankTxn.id,
              },
            ]
          : [
              {
                accountId: input.offsetAccountId,
                debit: remainingAmount,
                description: bankTxn.description,
                entityType: "bank_transaction",
                entityId: bankTxn.id,
              },
              {
                accountId: bankTxn.bankAccount.glAccountId,
                credit: remainingAmount,
                description: bankTxn.description,
                entityType: "bank_transaction",
                entityId: bankTxn.id,
                bankTransactionId: bankTxn.id,
              },
            ],
    });

    await tx.bankTransactionMatch.create({
      data: {
        orgId: input.orgId,
        bankTxnId: bankTxn.id,
        entityType: "JOURNAL_ENTRY",
        entityId: journal.id,
        matchedAmount: remainingAmount,
        confidenceScore: 100,
        status: "CONFIRMED",
        createdByUserId: input.actorId,
        confirmedAt: new Date(),
      },
    });

    await syncBankTransactionStatusTx(tx, bankTxn.id);

    return journal;
  });
}

export async function exportReconciliationCsv(
  orgId: string,
  filters: BankTransactionFilters = {},
) {
  const transactions = await db.bankTransaction.findMany({
    where: buildBankingWhere(orgId, filters),
    include: {
      bankAccount: {
        select: { name: true },
      },
      matches: {
        where: { status: "CONFIRMED" },
        select: {
          entityType: true,
          entityId: true,
          matchedAmount: true,
        },
      },
    },
    orderBy: [{ txnDate: "desc" }, { createdAt: "desc" }],
  });

  const { generateCSV } = await import("@/lib/csv");
  return generateCSV(
    [
      "Bank Account",
      "Date",
      "Direction",
      "Amount",
      "Reference",
      "Description",
      "Status",
      "Confirmed Matches",
    ],
    transactions.map((txn) => [
      txn.bankAccount.name,
      txn.txnDate.toISOString().slice(0, 10),
      txn.direction,
      txn.amount.toFixed(2),
      txn.reference ?? "",
      txn.description,
      txn.status,
      txn.matches
        .map((match) => `${match.entityType}:${match.entityId} (${match.matchedAmount.toFixed(2)})`)
        .join("; "),
    ]),
  );
}
