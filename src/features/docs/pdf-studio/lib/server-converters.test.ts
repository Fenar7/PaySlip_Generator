import { describe, expect, it } from "vitest";
import { isAllowedHtmlToPdfUrl } from "@/features/docs/pdf-studio/lib/server-converters";

describe("pdf studio server conversion URL guard", () => {
  it("allows public http and https URLs", () => {
    expect(isAllowedHtmlToPdfUrl("https://example.com/report")).toBe(true);
    expect(isAllowedHtmlToPdfUrl("http://public.example.org/print")).toBe(true);
  });

  it("blocks private, local, and non-http URL targets", () => {
    expect(isAllowedHtmlToPdfUrl("http://localhost:3000/secret")).toBe(false);
    expect(isAllowedHtmlToPdfUrl("http://127.0.0.1/admin")).toBe(false);
    expect(isAllowedHtmlToPdfUrl("http://192.168.1.25/internal")).toBe(false);
    expect(isAllowedHtmlToPdfUrl("http://10.0.0.5/health")).toBe(false);
    expect(isAllowedHtmlToPdfUrl("http://172.20.10.2/private")).toBe(false);
    expect(isAllowedHtmlToPdfUrl("http://[::1]/debug")).toBe(false);
    expect(isAllowedHtmlToPdfUrl("file:///tmp/secret.html")).toBe(false);
  });
});
