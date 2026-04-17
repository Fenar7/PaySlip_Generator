/**
 * Confidence-scored bank reconciliation match engine.
 *
 * Computes a 0-100 confidence score from independent signals defined in the
 * Phase 24 PRD §9. The scorer is pure (no DB access) and can be used both
 * in the auto-match engine and in unit tests.
 */

export const AUTO_CONFIRM_THRESHOLD = 95;
export const SUGGEST_THRESHOLD = 70;

// Signal weights (sum > 100 intentionally; final score is capped at 100)
const WEIGHTS = {
  exactAmount: 40,
  amountWithin1Pct: 25,
  dateWithin3Days: 20,
  payerNameMatch: 10,
  utrReferenceMatch: 20,
  singleOpenDoc: 15,
} as const;

export interface MatchInput {
  bankAmount: number;
  bankDate: Date;
  bankReference?: string | null;
  bankNormalizedPayee?: string | null;
  bankDescription: string;
}

export interface CandidateInput {
  candidateAmount: number;
  candidateDate: Date | string;
  candidateReference?: string | null;
  candidatePartyName?: string | null;
  isSingleOpenDocForParty?: boolean;
}

export interface MatchSignals {
  exactAmount: boolean;
  amountWithin1Pct: boolean;
  dateWithin3Days: boolean;
  payerNameMatch: boolean;
  utrReferenceMatch: boolean;
  singleOpenDoc: boolean;
}

export type MatchDisposition = "AUTO_CONFIRM" | "SUGGEST" | "IGNORE";

export interface ScoredMatch {
  confidence: number;
  signals: MatchSignals;
  disposition: MatchDisposition;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function scoreMatch(bank: MatchInput, candidate: CandidateInput): ScoredMatch {
  const candidateDate = toDate(candidate.candidateDate);
  const daysDiff = Math.abs(
    Math.round(
      (candidateDate.getTime() - bank.bankDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  const amountDiff = Math.abs(bank.bankAmount - candidate.candidateAmount);
  const exactAmount = amountDiff < 0.005; // within half a paisa
  const amountWithin1Pct =
    !exactAmount && amountDiff / Math.max(bank.bankAmount, 0.01) <= 0.01;

  const dateWithin3Days = daysDiff <= 3;

  const normalizedPayee = normalizeText(bank.bankNormalizedPayee ?? bank.bankDescription);
  const normalizedParty = normalizeText(candidate.candidatePartyName);
  const payerNameMatch =
    normalizedParty.length > 2 && normalizedPayee.includes(normalizedParty);

  const normalizedBankRef = normalizeText(bank.bankReference ?? "");
  const normalizedBankDesc = normalizeText(bank.bankDescription);
  const normalizedCandidateRef = normalizeText(candidate.candidateReference);
  const utrReferenceMatch =
    normalizedCandidateRef.length > 2 &&
    (normalizedBankRef.includes(normalizedCandidateRef) ||
      normalizedBankDesc.includes(normalizedCandidateRef));

  const singleOpenDoc = candidate.isSingleOpenDocForParty === true;

  const signals: MatchSignals = {
    exactAmount,
    amountWithin1Pct,
    dateWithin3Days,
    payerNameMatch,
    utrReferenceMatch,
    singleOpenDoc,
  };

  let raw = 0;
  if (exactAmount) raw += WEIGHTS.exactAmount;
  else if (amountWithin1Pct) raw += WEIGHTS.amountWithin1Pct;
  if (dateWithin3Days) raw += WEIGHTS.dateWithin3Days;
  if (payerNameMatch) raw += WEIGHTS.payerNameMatch;
  if (utrReferenceMatch) raw += WEIGHTS.utrReferenceMatch;
  if (singleOpenDoc) raw += WEIGHTS.singleOpenDoc;

  const confidence = Math.min(100, raw);
  const disposition = getDisposition(confidence);

  return { confidence, signals, disposition };
}

export function getDisposition(confidence: number): MatchDisposition {
  if (confidence >= AUTO_CONFIRM_THRESHOLD) return "AUTO_CONFIRM";
  if (confidence >= SUGGEST_THRESHOLD) return "SUGGEST";
  return "IGNORE";
}
