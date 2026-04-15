import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Mock OpenAI before importing provider
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

import { runAiCompletion, safeParseAiJson, getActiveProvider } from "../provider";

describe("getActiveProvider", () => {
  it("returns 'none' when OPENAI_API_KEY is not set", () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const provider = getActiveProvider();
    expect(provider).toBe("none");
    process.env.OPENAI_API_KEY = original;
  });

  it("returns 'openai' when OPENAI_API_KEY is set", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const provider = getActiveProvider();
    expect(provider).toBe("openai");
    delete process.env.OPENAI_API_KEY;
  });
});

describe("runAiCompletion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns no_credentials error when provider is none", async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await runAiCompletion({
      systemPrompt: "You are a helper",
      userPrompt: "What is 2+2?",
    });

    expect(result.success).toBe(false);
    expect((result as { success: false; error: { code: string } }).error.code).toBe("no_credentials");
  });
});

describe("safeParseAiJson", () => {
  it("parses valid JSON string", () => {
    const result = safeParseAiJson<{ foo: string }>('{"foo": "bar"}');
    expect(result).toEqual({ foo: "bar" });
  });

  it("extracts JSON from markdown code block", () => {
    const result = safeParseAiJson<{ fields: object }>('```json\n{"fields": {}}\n```');
    expect(result).toEqual({ fields: {} });
  });

  it("returns null on malformed JSON", () => {
    const result = safeParseAiJson("{not valid json}");
    expect(result).toBeNull();
  });

  it("returns null on empty string", () => {
    const result = safeParseAiJson("");
    expect(result).toBeNull();
  });

  it("returns null when no JSON object found in prose", () => {
    const result = safeParseAiJson("I cannot help with that request.");
    expect(result).toBeNull();
  });

  it("does not execute injected payloads — treats output as data", () => {
    // Prompt injection attempt in AI response: should parse to an object, not execute
    const injection = '{"action": "DROP TABLE users;", "confidence": 0.9}';
    const result = safeParseAiJson<{ action: string }>(injection);
    // Result must be a plain parsed object, not executed
    expect(result).not.toBeNull();
    expect(typeof result?.action).toBe("string");
  });
});
