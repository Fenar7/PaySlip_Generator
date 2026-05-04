"use server";

import {
  getSequenceConfig,
  updateSequenceSettingsAtomic,
  seedSequenceContinuity,
  getSequenceAuditHistory,
  previewResequencePreview,
  applyResequencePreview,
  diagnoseSequence,
  getSequenceSupportOverview,
  runHealthCheck,
} from "@/features/sequences/services/sequence-admin";
import {
  configureInitialSequences,
  getDefaultSequenceConfig,
} from "@/app/onboarding/actions";
import type { SequenceSupportOverview } from "@/features/sequences/services/sequence-admin";
import { previewSequenceNumber } from "@/features/sequences/services/sequence-engine";
import type {
  SequenceDocumentType,
  SequencePeriodicity,
  ResequencePreviewInput,
  ResequencePreviewResult,
  ResequenceApplyInput,
  ResequenceApplyResult,
  SequenceDiagnosticsInput,
  SequenceDiagnosticsResult,
  HealthCheckReport,
} from "@/features/sequences/types";
import { ResequencePreviewInputSchema, ResequenceApplyInputSchema, SequenceDiagnosticsInputSchema } from "@/features/sequences/schema";

export interface SequenceSettingsData {
  documentType: SequenceDocumentType;
  name: string;
  periodicity: SequencePeriodicity;
  isActive: boolean;
  formatString: string | null;
  startCounter: number | null;
  counterPadding: number | null;
  currentCounter: number | null;
  nextPreview: string | null;
}

export async function getSequenceSettings(
  orgId: string
): Promise<{ invoice: SequenceSettingsData | null; voucher: SequenceSettingsData | null }> {
  const [invoice, voucher] = await Promise.all([
    getSequenceConfig({ orgId, documentType: "INVOICE" }),
    getSequenceConfig({ orgId, documentType: "VOUCHER" }),
  ]);

  const now = new Date();

  const invoicePreview = invoice?.sequenceId
    ? await previewSequenceNumber({
        sequenceId: invoice.sequenceId,
        documentDate: now,
        orgId,
      }).catch(() => null)
    : null;

  const voucherPreview = voucher?.sequenceId
    ? await previewSequenceNumber({
        sequenceId: voucher.sequenceId,
        documentDate: now,
        orgId,
      }).catch(() => null)
    : null;

  return {
    invoice: invoice
      ? {
          documentType: "INVOICE",
          name: invoice.name,
          periodicity: invoice.periodicity,
          isActive: invoice.isActive,
          formatString: invoice.formatString,
          startCounter: invoice.startCounter,
          counterPadding: invoice.counterPadding,
          currentCounter: invoice.currentCounter,
          nextPreview: invoicePreview?.preview ?? null,
        }
      : null,
    voucher: voucher
      ? {
          documentType: "VOUCHER",
          name: voucher.name,
          periodicity: voucher.periodicity,
          isActive: voucher.isActive,
          formatString: voucher.formatString,
          startCounter: voucher.startCounter,
          counterPadding: voucher.counterPadding,
          currentCounter: voucher.currentCounter,
          nextPreview: voucherPreview?.preview ?? null,
        }
      : null,
  };
}

export async function updateSequenceSettings(
  orgId: string,
  params: {
    documentType: SequenceDocumentType;
    formatString: string;
    periodicity: SequencePeriodicity;
  }
) {
  return updateSequenceSettingsAtomic({
    orgId,
    documentType: params.documentType,
    formatString: params.formatString,
    periodicity: params.periodicity,
  });
}

export async function initializeSequenceSettings(
  orgId: string,
  params: {
    documentType: SequenceDocumentType;
    formatString?: string;
    periodicity?: SequencePeriodicity;
    latestUsedNumber?: string;
  }
) {
  const customConfig =
    params.formatString && params.periodicity
      ? {
          documentType: params.documentType,
          formatString: params.formatString,
          periodicity: params.periodicity,
          latestUsedNumber: params.latestUsedNumber,
        }
      : {
          ...getDefaultSequenceConfig(params.documentType),
          latestUsedNumber: params.latestUsedNumber,
        };

  return configureInitialSequences({
    organizationId: orgId,
    customConfigs: [customConfig],
    markOnboardingComplete: false,
  });
}

export async function previewSequenceSetting(
  orgId: string,
  params: {
    sequenceId: string;
    documentDate: Date;
  }
) {
  return previewSequenceNumber({
    sequenceId: params.sequenceId,
    documentDate: params.documentDate,
    orgId,
  });
}

export async function seedSequenceSetting(
  orgId: string,
  params: {
    documentType: SequenceDocumentType;
    latestUsedNumber: string;
  }
) {
  return seedSequenceContinuity({
    orgId,
    documentType: params.documentType,
    latestUsedNumber: params.latestUsedNumber,
  });
}

export async function getSequenceHistory(
  orgId: string,
  documentType?: SequenceDocumentType
) {
  return getSequenceAuditHistory({
    orgId,
    documentType,
    limit: 50,
    offset: 0,
  });
}

export async function previewResequence(
  input: ResequencePreviewInput
): Promise<ResequencePreviewResult> {
  const parsed = ResequencePreviewInputSchema.parse(input);
  return previewResequencePreview(parsed);
}

export async function applyResequence(
  input: ResequenceApplyInput
): Promise<ResequenceApplyResult> {
  const parsed = ResequenceApplyInputSchema.parse(input);
  return applyResequencePreview(parsed);
}

export async function diagnoseSequenceHealth(
  input: SequenceDiagnosticsInput
): Promise<SequenceDiagnosticsResult> {
  const parsed = SequenceDiagnosticsInputSchema.parse(input);
  return diagnoseSequence(parsed);
}

export async function getSupportOverview(
  orgId: string,
  documentType: SequenceDocumentType
): Promise<SequenceSupportOverview | null> {
  return getSequenceSupportOverview({ orgId, documentType });
}

export async function runSequenceHealthCheck(
  orgId: string,
  documentType: SequenceDocumentType
): Promise<HealthCheckReport> {
  return runHealthCheck({ orgId, documentType });
}
