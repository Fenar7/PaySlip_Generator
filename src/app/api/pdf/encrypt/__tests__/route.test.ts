import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import {
  INVALID_PASSWORD_PERMISSIONS_MESSAGE,
  PDF_STUDIO_PASSWORD_MAX_LENGTH,
} from "@/features/docs/pdf-studio/utils/password";

const { encryptPDF } = vi.hoisted(() => ({
  encryptPDF: vi.fn(),
}));

vi.mock("@pdfsmaller/pdf-encrypt", () => ({
  encryptPDF,
}));

import { POST } from "../route";

let requestCounter = 0;

function makeRequest(
  fields: Record<string, string | File>,
  options?: { headers?: Record<string, string> },
) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value instanceof File) {
      formData.append(key, value, value.name);
      continue;
    }
    formData.append(key, value);
  }
  return new Request("http://localhost/api/pdf/encrypt", {
    method: "POST",
    headers: {
      "x-forwarded-for": `test-ip-${requestCounter++}`,
      ...options?.headers,
    },
    body: formData,
  }) as NextRequest;
}

function makePdfBlob() {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "test.pdf", {
    type: "application/pdf",
  });
}

function makeOptions(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    userPassword: "secret",
    permissions: { printing: true, copying: true, modifying: true },
    ...overrides,
  });
}

describe("POST /api/pdf/encrypt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    encryptPDF.mockResolvedValue(
      new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
    );
  });

  it("returns 400 when pdf is missing", async () => {
    const request = makeRequest({ options: makeOptions() });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("pdf is required");
  });

  it("returns 400 when options is missing", async () => {
    const request = makeRequest({ pdf: makePdfBlob() });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("options is required");
  });

  it("returns 400 when userPassword is empty", async () => {
    const request = makeRequest({
      pdf: makePdfBlob(),
      options: JSON.stringify({ userPassword: "" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Password is required");
  });

  it("returns 400 when userPassword exceeds max length", async () => {
    const request = makeRequest({
      pdf: makePdfBlob(),
      options: JSON.stringify({
        userPassword: "a".repeat(PDF_STUDIO_PASSWORD_MAX_LENGTH + 1),
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(
      `Password must be ${PDF_STUDIO_PASSWORD_MAX_LENGTH} characters or fewer`,
    );
  });

  it("returns 400 when ownerPassword exceeds max length", async () => {
    const request = makeRequest({
      pdf: makePdfBlob(),
      options: JSON.stringify({
        userPassword: "secret",
        ownerPassword: "o".repeat(PDF_STUDIO_PASSWORD_MAX_LENGTH + 1),
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(
      `Owner password must be ${PDF_STUDIO_PASSWORD_MAX_LENGTH} characters or fewer`,
    );
  });

  it("returns 400 when ownerPassword is not a string", async () => {
    const request = makeRequest({
      pdf: makePdfBlob(),
      options: JSON.stringify({
        userPassword: "secret",
        ownerPassword: 1234,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Owner password must be a string");
  });

  it("returns 400 when permissions contain non-boolean values", async () => {
    const request = makeRequest({
      pdf: makePdfBlob(),
      options: JSON.stringify({
        userPassword: "secret",
        permissions: {
          printing: "yes",
          copying: true,
          modifying: true,
        },
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(INVALID_PASSWORD_PERMISSIONS_MESSAGE);
  });

  it("returns 413 when PDF is too large", async () => {
    const formData = new FormData();
    const largeBlob = new Blob([new Uint8Array(51 * 1024 * 1024)]);
    Object.defineProperty(largeBlob, "size", { value: 51 * 1024 * 1024, writable: false });
    formData.append("pdf", largeBlob);
    formData.append("options", makeOptions());

    const request = new Request("http://localhost/api/pdf/encrypt", {
      method: "POST",
      body: formData,
    }) as NextRequest;
    vi.spyOn(request, "formData").mockResolvedValue(formData);

    const response = await POST(request);

    expect(response.status).toBe(413);
    const json = await response.json();
    expect(json.error).toBe(
      "PDF is too large to encrypt. Try reducing image count or quality.",
    );
  });

  it("returns 429 when rate limited", async () => {
    // Saturate rate limit with 10 rapid requests from same IP
    const headers = { "x-forwarded-for": "1.2.3.4" };
    for (let i = 0; i < 10; i++) {
      const request = makeRequest({ pdf: makePdfBlob(), options: makeOptions() }, { headers });
      await POST(request);
    }

    const request = makeRequest({ pdf: makePdfBlob(), options: makeOptions() }, { headers });
    const response = await POST(request);

    expect(response.status).toBe(429);
    const json = await response.json();
    expect(json.error).toBe("Too many requests. Please wait a moment and try again.");
  });

  it("returns encrypted PDF on success", async () => {
    const request = makeRequest({
      pdf: makePdfBlob(),
      options: makeOptions(),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(encryptPDF).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      "secret",
      expect.objectContaining({
        algorithm: "AES-256",
        allowPrinting: true,
        allowCopying: true,
        allowModifying: true,
      }),
    );
  });

  it("accepts a userPassword at exactly the shared max length", async () => {
    const atLimit = "a".repeat(PDF_STUDIO_PASSWORD_MAX_LENGTH);
    const request = makeRequest({
      pdf: makePdfBlob(),
      options: makeOptions({ userPassword: atLimit }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(encryptPDF).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      atLimit,
      expect.any(Object),
    );
  });

  it("returns 500 when encryptPDF throws", async () => {
    encryptPDF.mockRejectedValue(new Error("Encryption engine failure"));

    const request = makeRequest({
      pdf: makePdfBlob(),
      options: makeOptions(),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("PDF encryption failed. Please try again.");
  });

  it("returns 500 when encrypted output lacks PDF header", async () => {
    encryptPDF.mockResolvedValue(new Uint8Array([0x00, 0x00, 0x00, 0x00]));

    const request = makeRequest({
      pdf: makePdfBlob(),
      options: makeOptions(),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Encryption produced invalid output");
  });
});
