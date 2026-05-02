import type {
  Sequence,
  SequenceFormat,
  SequencePeriod,
  SequenceDocumentType,
  SequencePeriodicity,
  SequencePeriodStatus,
} from "@/generated/prisma/client";

export type {
  Sequence,
  SequenceFormat,
  SequencePeriod,
  SequenceDocumentType,
  SequencePeriodicity,
  SequencePeriodStatus,
};

export type DocumentTypeForSequence = "INVOICE" | "VOUCHER";

export interface SequenceConfig {
  sequenceId: string;
  orgId: string;
  documentType: DocumentTypeForSequence;
  periodicity: SequencePeriodicity;
  defaultFormat: {
    formatString: string;
    startCounter: number;
    counterPadding: number;
  };
}

export interface PeriodContext {
  periodId: string;
  sequenceId: string;
  startDate: Date;
  endDate: Date;
  currentCounter: number;
}

export interface RenderContext {
  documentDate: Date;
  prefix: string;
  sequenceNumber: number;
  orgSlug?: string;
}

export interface PreviewResult {
  preview: string;
  nextCounter: number;
  periodId: string | null;
}

export interface ConsumeResult {
  formattedNumber: string;
  sequenceNumber: number;
  periodId: string;
}

export interface Token {
  type: "literal" | "token";
  value: string;
}

export interface FormatValidationResult {
  valid: boolean;
  tokens: Token[];
  errors: string[];
}

export interface ContinuitySeedResult {
  formatString: string;
  startCounter: number;
  counterPadding: number;
  periodicity: SequencePeriodicity;
  inferred: boolean;
}

export interface HealthCheckFailure {
  check: string;
  severity: "warning" | "critical";
  message: string;
  count?: number;
  details?: Record<string, unknown>;
}

export interface HealthCheckReport {
  passed: boolean;
  failures: HealthCheckFailure[];
  timestamp: string;
}

// ─── Resequence Preview (Phase 6 / Sprint 6.1) ────────────────────────────────

export type ResequenceOrderBy = "document_date" | "current_number";

export interface ResequencePreviewInput {
  orgId: string;
  documentType: SequenceDocumentType;
  startDate: Date;
  endDate: Date;
  orderBy: ResequenceOrderBy;
  lockDate?: Date;
}

export type ResequenceRecordStatus =
  | "unchanged"
  | "renumbered"
  | "blocked";

export interface ResequenceRecordMapping {
  documentId: string;
  documentDate: Date;
  oldNumber: string;
  proposedNumber: string | null;
  status: ResequenceRecordStatus;
  reason: string | null;
  oldCounter: number | null;
  proposedCounter: number | null;
  periodKey: string;
}

export interface ResequencePreviewSummary {
  totalDocuments: number;
  unchanged: number;
  renumbered: number;
  blocked: number;
}

export interface ResequencePreviewResult {
  summary: ResequencePreviewSummary;
  mappings: ResequenceRecordMapping[];
  sequenceId: string;
  formatString: string;
  periodicity: SequencePeriodicity;
  previewFingerprint: string;
}

// ─── Resequence Apply (Phase 6 / Sprint 6.2) ──────────────────────────────────

export interface ResequenceApplyInput {
  orgId: string;
  documentType: SequenceDocumentType;
  startDate: Date;
  endDate: Date;
  orderBy: ResequenceOrderBy;
  lockDate?: Date;
  expectedFingerprint: string;
}

export interface ResequenceApplyResult {
  summary: { totalConsidered: number; applied: number; unchanged: number; blocked: number; failed: number };
  appliedDocumentIds: string[];
  preview: ResequencePreviewResult;
}
