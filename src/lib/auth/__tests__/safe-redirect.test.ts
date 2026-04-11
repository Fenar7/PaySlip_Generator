import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "../safe-redirect";

describe("getSafeRedirectPath", () => {
  it("allows safe internal app routes", () => {
    expect(getSafeRedirectPath("/app/home?tab=billing#usage")).toBe(
      "/app/home?tab=billing#usage",
    );
  });

  it("falls back for absolute external URLs", () => {
    expect(getSafeRedirectPath("https://evil.example/phish", "/app/home")).toBe(
      "/app/home",
    );
  });

  it("falls back for protocol-relative paths", () => {
    expect(getSafeRedirectPath("//evil.example", "/auth/login")).toBe(
      "/auth/login",
    );
  });

  it("falls back for disallowed local paths", () => {
    expect(getSafeRedirectPath("/api/admin", "/onboarding")).toBe("/onboarding");
  });
});
