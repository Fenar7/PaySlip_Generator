import type { SequenceDocumentType, SequencePeriodicity } from "@/features/sequences/types";

export interface SequenceDefaultConfig {
  documentType: SequenceDocumentType;
  name: string;
  formatString: string;
  periodicity: SequencePeriodicity;
  startCounter: number;
  counterPadding: number;
}

export const DEFAULT_SEQUENCE_CONFIGS: SequenceDefaultConfig[] = [
  {
    documentType: "INVOICE",
    name: "Default Invoice Sequence",
    formatString: "INV/{YYYY}/{NNNNN}",
    periodicity: "YEARLY",
    startCounter: 1,
    counterPadding: 5,
  },
  {
    documentType: "VOUCHER",
    name: "Default Voucher Sequence",
    formatString: "VCH/{YYYY}/{NNNNN}",
    periodicity: "YEARLY",
    startCounter: 1,
    counterPadding: 5,
  },
];

export function getDefaultSequenceConfig(
  documentType: SequenceDocumentType
): SequenceDefaultConfig {
  const config = DEFAULT_SEQUENCE_CONFIGS.find(
    (entry) => entry.documentType === documentType
  );

  if (!config) {
    throw new Error(`No default sequence config found for ${documentType}`);
  }

  return { ...config };
}
