"use server";

import {
  getSequenceConfig,
  updateSequenceFormat,
  updateSequencePeriodicity,
} from "@/features/sequences/services/sequence-admin";
import { previewSequenceNumber } from "@/features/sequences/services/sequence-engine";
import type { SequenceDocumentType, SequencePeriodicity } from "@/features/sequences/types";

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
  await updateSequenceFormat({
    orgId,
    documentType: params.documentType,
    formatString: params.formatString,
  });

  await updateSequencePeriodicity({
    orgId,
    documentType: params.documentType,
    periodicity: params.periodicity,
  });

  return { success: true };
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
