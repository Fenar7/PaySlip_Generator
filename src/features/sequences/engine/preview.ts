import { validateFormat } from "./tokenizer";
import { render, buildRenderContext } from "./renderer";
import type { PreviewResult } from "../types";

export interface PreviewInputs {
  formatString: string;
  prefix: string;
  documentDate: Date;
  periodicity: SequenceConfig["periodicity"];
  currentCounter: number;
  periodId: string | null;
  startCounter: number;
}

/**
 * Generate a preview of the next number without consuming the counter.
 *
 * This is a pure function — no database interaction.
 */
export function generatePreview(inputs: PreviewInputs): PreviewResult {
  const validation = validateFormat(inputs.formatString);
  if (!validation.valid) {
    throw new Error(`Invalid format string: ${validation.errors.join(", ")}`);
  }

  const tokens = validation.tokens;
  const nextCounter =
    inputs.periodId === null ? inputs.startCounter : inputs.currentCounter + 1;

  const context = buildRenderContext(
    inputs.documentDate,
    inputs.prefix,
    nextCounter
  );

  const preview = render(tokens, context);

  return {
    preview,
    nextCounter,
    periodId: inputs.periodId,
  };
}

/**
 * Determine which period a document date falls into for a given periodicity.
 *
 * Returns null if no matching period is found in the provided periods list.
 */
export function findPeriodForDate(
  documentDate: Date,
  periodicity: SequenceConfig["periodicity"],
  periods: PeriodContext[]
): PeriodContext | null {
  for (const period of periods) {
    if (
      documentDate >= stripTime(period.startDate) &&
      documentDate <= stripTime(period.endDate)
    ) {
      return period;
    }
  }
  return null;
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
