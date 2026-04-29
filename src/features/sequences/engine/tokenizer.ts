import type { Token, FormatValidationResult } from "../types";

const VALID_TOKENS = new Set([
  "PREFIX",
  "YYYY",
  "MM",
  "DD",
  "NNNNN",
  "FY",
]);

/**
 * Parse a format string into a list of tokens.
 *
 * Supported tokens:
 *   {PREFIX}  - static org-defined prefix
 *   {YYYY}    - 4-digit year
 *   {MM}      - 2-digit month
 *   {DD}      - 2-digit day
 *   {NNNNN}   - running number (any number of Ns, padding = count of Ns)
 *   {FY}      - financial year label
 *
 * Everything outside braces is treated as literal text.
 */
export function tokenize(formatString: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < formatString.length) {
    if (formatString[i] === "{") {
      const close = formatString.indexOf("}", i);
      if (close === -1) {
        // Unclosed brace — treat rest as literal
        tokens.push({ type: "literal", value: formatString.slice(i) });
        break;
      }
      const inner = formatString.slice(i + 1, close);
      tokens.push({ type: "token", value: inner });
      i = close + 1;
    } else {
      const nextBrace = formatString.indexOf("{", i);
      const end = nextBrace === -1 ? formatString.length : nextBrace;
      tokens.push({ type: "literal", value: formatString.slice(i, end) });
      i = end;
    }
  }

  return tokens;
}

/**
 * Validate a format string.
 *
 * Rules:
 * - Must contain exactly one running number token ({N+})
 * - All braced tokens must be known
 * - Max length 128 characters
 */
export function validateFormat(formatString: string): FormatValidationResult {
  const errors: string[] = [];

  if (formatString.length > 128) {
    errors.push("Format string exceeds maximum length of 128 characters");
  }

  if (formatString.length === 0) {
    errors.push("Format string cannot be empty");
  }

  const tokens = tokenize(formatString);
  const parsedTokens: Token[] = [];
  let runningNumberCount = 0;
  const unclosedBrace = false;

  for (const token of tokens) {
    if (token.type === "literal") {
      parsedTokens.push(token);
      continue;
    }

    // token.type === "token"
    const inner = token.value;

    if (inner === "") {
      errors.push("Empty token {} is not allowed");
      parsedTokens.push(token);
      continue;
    }

    // Check for running number token (any number of Ns)
    if (/^N+$/.test(inner)) {
      runningNumberCount++;
      parsedTokens.push(token);
      continue;
    }

    if (!VALID_TOKENS.has(inner)) {
      errors.push(`Unknown token: {${inner}}`);
    }

    parsedTokens.push(token);
  }

  // Check for unclosed brace by looking for literal text starting with "{".
  // The tokenizer handles this by treating the rest as literal, but we
  // should flag it as an error.
  const lastToken = tokens[tokens.length - 1];
  if (lastToken?.type === "literal" && lastToken.value.startsWith("{")) {
    errors.push("Unclosed brace in format string");
  }

  if (runningNumberCount === 0) {
    errors.push("Format string must contain exactly one running number token {NNNNN}");
  } else if (runningNumberCount > 1) {
    errors.push(`Format string contains ${runningNumberCount} running number tokens; only one is allowed`);
  }

  return {
    valid: errors.length === 0,
    tokens: parsedTokens,
    errors,
  };
}

/**
 * Extract the padding width from the running number token.
 * Returns the count of Ns in the token (e.g., {NNNNN} → 5).
 */
export function getRunningNumberPadding(tokens: Token[]): number {
  for (const token of tokens) {
    if (token.type === "token" && /^N+$/.test(token.value)) {
      return token.value.length;
    }
  }
  return 5; // default fallback
}
