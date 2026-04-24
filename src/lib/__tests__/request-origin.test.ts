import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getRequestOrigin } from "../request-origin";

describe("getRequestOrigin", () => {
  it("prefers forwarded host/proto over Next dev localhost normalization", () => {
    const request = new NextRequest("http://localhost:3001/api/auth/password-login", {
      headers: {
        host: "localhost:3001",
        "x-forwarded-host": "192.168.29.173:3001",
        "x-forwarded-proto": "http",
      },
    });

    expect(getRequestOrigin(request)).toBe("http://192.168.29.173:3001");
  });

  it("falls back to the request host when forwarded headers are absent", () => {
    const request = new NextRequest("https://app.slipwise.com/auth/login");

    expect(getRequestOrigin(request)).toBe("https://app.slipwise.com");
  });
});
