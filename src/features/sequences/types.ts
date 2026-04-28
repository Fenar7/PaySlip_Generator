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
