import type { Token, RenderContext } from "../types";

/**
 * Render a format string by substituting tokens with values from context.
 *
 * @param tokens - Parsed tokens from tokenize()
 * @param context - Values to substitute
 * @returns The rendered string
 */
export function render(tokens: Token[], context: RenderContext): string {
  let result = "";

  for (const token of tokens) {
    if (token.type === "literal") {
      result += token.value;
      continue;
    }

    const inner = token.value;

    if (inner === "PREFIX") {
      result += context.prefix;
    } else if (inner === "YYYY") {
      result += String(context.documentDate.getFullYear());
    } else if (inner === "MM") {
      result += String(context.documentDate.getMonth() + 1).padStart(2, "0");
    } else if (inner === "DD") {
      result += String(context.documentDate.getDate()).padStart(2, "0");
    } else if (/^N+$/.test(inner)) {
      const padding = inner.length;
      result += String(context.sequenceNumber).padStart(padding, "0");
    } else if (inner === "FY") {
      result += computeFinancialYearLabel(context.documentDate, context.orgSlug);
    } else {
      // Unknown token — leave as-is (should not happen after validation)
      result += `{${inner}}`;
    }
  }

  return result;
}

/**
 * Compute a financial year label like "FY25-26" from a document date.
 *
 * This uses a simplified heuristic because the org's fiscalYearStart
 * is not available in the renderer context. The full FY computation
 * with org-specific fiscal year start is handled in the service layer
 * by pre-computing the FY label and passing it as part of the prefix.
 *
 * For Phase 1, we compute FY based on a default April start.
 * This is overridden by the service layer when org config is available.
 */
function computeFinancialYearLabel(date: Date, _orgSlug?: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  // Default: fiscal year starts in April (month 4)
  // If month >= 4, FY is current year — next year (e.g., FY25-26)
  // If month < 4, FY is previous year — current year (e.g., FY24-25)
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;

  const shortStart = String(startYear).slice(-2);
  const shortEnd = String(endYear).slice(-2);

  return `FY${shortStart}-${shortEnd}`;
}

/**
 * Build a RenderContext from raw inputs.
 */
export function buildRenderContext(
  documentDate: Date,
  prefix: string,
  sequenceNumber: number,
  orgSlug?: string
): RenderContext {
  return {
    documentDate,
    prefix,
    sequenceNumber,
    orgSlug,
  };
}
