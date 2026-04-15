import "server-only";

/**
 * AI Provider abstraction for Slipwise One.
 *
 * All AI calls go through this boundary. Feature modules must not call
 * provider SDKs directly. This ensures:
 * - provider selection and versioning in one place
 * - prompt template key/version capture
 * - structured response validation
 * - timeout and retry handling
 * - cost/usage metering hooks
 * - safe degradation when credentials are missing
 * - no PII leakage in error paths
 */

export type AiProvider = "openai" | "none";

export interface AiRequestOptions {
  /** Named prompt template (e.g. "document_extraction_v1") */
  promptTemplateKey: string;
  promptTemplateVersion: string;
  systemPrompt: string;
  userPrompt: string;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Temperature: 0 = deterministic, 1 = creative */
  temperature?: number;
  /** Timeout in milliseconds */
  timeoutMs?: number;
}

export interface AiResponse {
  provider: AiProvider;
  model: string;
  rawText: string;
  tokensInput: number;
  tokensOutput: number;
  /** Estimated cost in paise (1/100 INR) */
  costEstimatePaise: number;
}

export interface AiProviderError {
  code: "no_credentials" | "timeout" | "provider_error" | "rate_limited" | "output_invalid";
  message: string;
}

export type AiResult =
  | { success: true; data: AiResponse }
  | { success: false; error: AiProviderError };

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 2048;

function getActiveProvider(): AiProvider {
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

async function callOpenAI(options: AiRequestOptions): Promise<AiResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: { code: "no_credentials", message: "OPENAI_API_KEY is not configured" },
    };
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: options.temperature ?? 0.2,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return { success: false, error: { code: "rate_limited", message: "OpenAI rate limit exceeded" } };
      }
      return { success: false, error: { code: "provider_error", message: `OpenAI HTTP ${status}` } };
    }

    const json = await response.json();
    const choice = json.choices?.[0]?.message?.content;
    if (typeof choice !== "string") {
      return { success: false, error: { code: "output_invalid", message: "No content in OpenAI response" } };
    }

    const usage = json.usage ?? {};
    const tokensInput: number = usage.prompt_tokens ?? 0;
    const tokensOutput: number = usage.completion_tokens ?? 0;
    // Rough cost estimate: gpt-4o-mini ~$0.00015/1k input, $0.0006/1k output (in paise at ₹85/USD)
    const costEstimatePaise = Math.round(
      ((tokensInput / 1000) * 0.00015 + (tokensOutput / 1000) * 0.0006) * 85 * 100,
    );

    return {
      success: true,
      data: {
        provider: "openai",
        model,
        rawText: choice,
        tokensInput,
        tokensOutput,
        costEstimatePaise,
      },
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: { code: "timeout", message: `AI provider timed out after ${timeoutMs}ms` } };
    }
    return {
      success: false,
      error: { code: "provider_error", message: err instanceof Error ? err.message : "Unknown error" },
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Execute an AI completion request through the active provider.
 * Returns a structured result — never throws.
 * Callers must validate `data.rawText` before using it as structured data.
 */
export async function runAiCompletion(options: AiRequestOptions): Promise<AiResult> {
  const provider = getActiveProvider();

  if (provider === "none") {
    return {
      success: false,
      error: { code: "no_credentials", message: "No AI provider credentials configured" },
    };
  }

  return callOpenAI(options);
}

/**
 * Safely parse a JSON string from an AI response.
 * Handles raw JSON and markdown-wrapped code blocks.
 * Returns null instead of throwing on malformed output.
 */
export function safeParseAiJson<T = unknown>(rawText: string): T | null {
  if (!rawText || rawText.trim() === "") return null;

  // Strip markdown code block wrappers: ```json ... ``` or ``` ... ```
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = codeBlockMatch ? codeBlockMatch[1].trim() : rawText.trim();

  // Try direct parse first
  try {
    const parsed = JSON.parse(text) as T;
    return parsed;
  } catch {
    // Fall through to find-first-object heuristic
  }

  // Attempt to extract the first JSON object from prose
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]) as T;
      return parsed;
    } catch {
      // Give up
    }
  }

  return null;
}

export { getActiveProvider };
