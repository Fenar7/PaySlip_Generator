import type { SequencePeriodicity } from "./types";
import { tokenize, validateFormat, extractCounterFromFormat } from "./engine/tokenizer";
import { render, buildRenderContext } from "./engine/renderer";

export interface SequenceBuilderConfig {
  prefix: string;
  resetCycle: SequencePeriodicity;
  numberLength: 3 | 4 | 5 | 6;
  includeYear: boolean;
  includeMonth: boolean;
  useFinancialYear: boolean;
}

export const DEFAULT_INVOICE_CONFIG: SequenceBuilderConfig = {
  prefix: "INV",
  resetCycle: "YEARLY",
  numberLength: 5,
  includeYear: true,
  includeMonth: false,
  useFinancialYear: false,
};

export const DEFAULT_VOUCHER_CONFIG: SequenceBuilderConfig = {
  prefix: "VCH",
  resetCycle: "YEARLY",
  numberLength: 5,
  includeYear: true,
  includeMonth: false,
  useFinancialYear: false,
};

export const RESET_CYCLE_LABELS: Record<SequencePeriodicity, string> = {
  NONE: "Continuous (no reset)",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
  FINANCIAL_YEAR: "Financial year",
};

export const RESET_CYCLE_SHORT_LABELS: Record<SequencePeriodicity, string> = {
  NONE: "never resets",
  MONTHLY: "resets every month",
  YEARLY: "resets every year",
  FINANCIAL_YEAR: "resets every financial year",
};

/**
 * Build a format string from a user-friendly builder config.
 */
export function buildFormatString(config: SequenceBuilderConfig): string {
  const parts: string[] = [config.prefix];

  if (config.useFinancialYear) {
    parts.push("/{FY}");
  } else if (config.includeYear && config.includeMonth) {
    parts.push("/{YYYY}/{MM}");
  } else if (config.includeYear) {
    parts.push("/{YYYY}");
  } else if (config.includeMonth) {
    parts.push("/{MM}");
  }

  const numberToken = "N".repeat(config.numberLength);
  parts.push(`/{${numberToken}}`);

  return parts.join("");
}

/**
 * Attempt to parse an existing format string into a builder config.
 * Returns null if the format string uses patterns not supported by the builder.
 */
export function parseFormatString(
  formatString: string,
  defaultPrefix: string
): SequenceBuilderConfig | null {
  const validation = validateFormat(formatString);
  if (!validation.valid) return null;

  const tokens = tokenize(formatString);

  // Extract prefix from leading literal
  let prefix = defaultPrefix;
  const firstToken = tokens[0];
  if (firstToken?.type === "literal") {
    const raw = firstToken.value;
    // Remove trailing separator if present
    prefix = raw.replace(/[/\-_]+$/, "");
  }

  // Detect date tokens
  const hasYear = tokens.some((t) => t.type === "token" && t.value === "YYYY");
  const hasMonth = tokens.some((t) => t.type === "token" && t.value === "MM");
  const hasFY = tokens.some((t) => t.type === "token" && t.value === "FY");

  // Detect running number padding
  let numberLength: 3 | 4 | 5 | 6 = 5;
  for (const token of tokens) {
    if (token.type === "token" && /^N+$/.test(token.value)) {
      const len = token.value.length;
      if (len >= 3 && len <= 6) {
        numberLength = len as 3 | 4 | 5 | 6;
      }
      break;
    }
  }

  // Detect periodicity from format tokens if possible
  let resetCycle: SequencePeriodicity = "NONE";
  if (hasFY) {
    resetCycle = "FINANCIAL_YEAR";
  } else if (hasMonth) {
    resetCycle = "MONTHLY";
  } else if (hasYear) {
    resetCycle = "YEARLY";
  }

  // If the format string contains patterns the builder doesn't support
  // (like DD, custom separators that aren't "/", multiple literals between tokens),
  // return null so the UI can fall back to advanced mode.
  const hasDay = tokens.some((t) => t.type === "token" && t.value === "DD");
  if (hasDay) return null;

  // Check for PREFIX token — builder doesn't support it
  const hasPrefixToken = tokens.some((t) => t.type === "token" && t.value === "PREFIX");
  if (hasPrefixToken) return null;

  // Check separator consistency — builder only supports "/"
  // Skip the first literal since it contains the prefix
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "literal" && token.value.length > 0) {
      // Allow "/" or empty, but if there are other separators mixed in, it's advanced
      const nonSlash = token.value.replace(/\//g, "");
      if (nonSlash.length > 0 && !/^[_\-]+$/.test(nonSlash)) {
        // Some other literal text exists; this is a custom format
        return null;
      }
    }
  }

  return {
    prefix: prefix || defaultPrefix,
    resetCycle,
    numberLength,
    includeYear: hasYear,
    includeMonth: hasMonth,
    useFinancialYear: hasFY,
  };
}

/**
 * Generate a human-readable summary sentence for a builder config.
 */
export function buildSummarySentence(
  documentType: "invoice" | "voucher",
  config: SequenceBuilderConfig,
  nextPreview?: string | null
): string {
  const noun = documentType === "invoice" ? "Invoices" : "Vouchers";
  const pattern = buildFormatString(config);

  // Build example by rendering with counter 1
  const example = renderPreview(pattern, 1);
  const resetText = RESET_CYCLE_SHORT_LABELS[config.resetCycle];

  let sentence = `${noun} will look like ${example} and ${resetText}.`;
  if (nextPreview) {
    sentence += ` Next number: ${nextPreview}.`;
  }
  return sentence;
}

/**
 * Render a preview number from a format string and counter.
 */
export function renderPreview(formatString: string, counter: number): string | null {
  const validation = validateFormat(formatString);
  if (!validation.valid) return null;

  try {
    const tokens = tokenize(formatString);
    const prefix = extractPrefixFromFormat(formatString);
    const ctx = buildRenderContext(new Date(), prefix, counter);
    return render(tokens, ctx);
  } catch {
    return null;
  }
}

function extractPrefixFromFormat(formatString: string): string {
  const tokens = tokenize(formatString);
  const first = tokens[0];
  if (first?.type === "literal") {
    return first.value.replace(/[/\-_]+$/, "");
  }
  return "";
}

/**
 * Build a human-friendly preview of what the next number will look like
 * given a format string and an optional last-used number.
 */
export function buildNextPreview(
  formatString: string,
  lastUsedNumber?: string
): { preview: string | null; nextCounter: number | null; error?: string } {
  const validation = validateFormat(formatString);
  if (!validation.valid) {
    return { preview: null, nextCounter: null, error: validation.errors.join("; ") };
  }

  let nextCounter = 1;
  if (lastUsedNumber?.trim()) {
    const extracted = extractCounterFromFormat(lastUsedNumber.trim(), formatString);
    if (extracted === null) {
      return {
        preview: null,
        nextCounter: null,
        error: "This number does not match your current numbering style.",
      };
    }
    nextCounter = extracted + 1;
  }

  const preview = renderPreview(formatString, nextCounter);
  return { preview, nextCounter };
}

/**
 * Validate that a builder config produces a valid format string
 * and that the format is compatible with the chosen reset cycle.
 */
export function validateBuilderConfig(config: SequenceBuilderConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.prefix || config.prefix.trim().length === 0) {
    errors.push("Prefix is required");
  }

  if (config.prefix.length > 20) {
    errors.push("Prefix must be 20 characters or fewer");
  }

  const formatString = buildFormatString(config);
  const formatValidation = validateFormat(formatString);
  if (!formatValidation.valid) {
    errors.push(...formatValidation.errors);
  }

  // Periodicity alignment rules
  if (config.resetCycle !== "NONE" && !config.includeYear && !config.useFinancialYear) {
    errors.push(
      `A reset cycle of "${RESET_CYCLE_LABELS[config.resetCycle]}" requires the number to include a year or financial year so period boundaries are visible.`
    );
  }

  if (config.resetCycle === "MONTHLY" && !config.includeMonth && !config.useFinancialYear) {
    errors.push(
      `A monthly reset cycle requires the number to include a month or financial year so months are distinguishable.`
    );
  }

  if (config.resetCycle === "FINANCIAL_YEAR" && !config.useFinancialYear) {
    errors.push(
      `A financial year reset cycle requires the number to include a financial year label.`
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Derive the default builder config for a document type.
 */
export function getDefaultBuilderConfig(
  documentType: "INVOICE" | "VOUCHER"
): SequenceBuilderConfig {
  return documentType === "INVOICE" ? { ...DEFAULT_INVOICE_CONFIG } : { ...DEFAULT_VOUCHER_CONFIG };
}
