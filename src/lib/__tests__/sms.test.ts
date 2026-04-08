import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only (handled by vitest alias, but just in case)
vi.mock("server-only", () => ({}));

const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

// We import after mocking
import { sendSms } from "../sms";

describe("sendSms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MSG91_API_KEY;
    delete process.env.MSG91_SENDER_ID;
  });

  it("returns error when MSG91_API_KEY not configured", async () => {
    const result = await sendSms({ phone: "9876543210", message: "Test" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("sms_provider_not_configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns error when phone is empty", async () => {
    process.env.MSG91_API_KEY = "test-key";
    const result = await sendSms({ phone: "", message: "Test" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("no_phone_on_file");
  });

  it("returns error for invalid phone number", async () => {
    process.env.MSG91_API_KEY = "test-key";
    const result = await sendSms({ phone: "12345", message: "Test" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("invalid_phone_number");
  });

  it("normalizes 10-digit Indian phone correctly", async () => {
    process.env.MSG91_API_KEY = "test-key";
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => "" });

    await sendSms({ phone: "9876543210", message: "Hello" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Direct SMS path (no flowId) — sends to MSG91 v2 API
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    // The phone should be stripped of the 91 prefix in the sms.to array
    expect(callBody.sms[0].to).toContain("9876543210");
  });

  it("normalizes 12-digit (91-prefixed) phone correctly", async () => {
    process.env.MSG91_API_KEY = "test-key";
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => "" });

    await sendSms({ phone: "919876543210", message: "Hello" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.sms[0].to).toContain("9876543210");
  });

  it("calls MSG91 Flow API when flowId provided", async () => {
    process.env.MSG91_API_KEY = "test-key";
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => "" });

    const result = await sendSms({
      phone: "9876543210",
      message: "Hello",
      flowId: "flow-123",
      templateVars: { invoice_number: "INV-001" },
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.msg91.com/api/v5/flow/",
      expect.objectContaining({ method: "POST" })
    );
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.flow_id).toBe("flow-123");
    expect(callBody.mobiles).toBe("919876543210");
  });

  it("calls MSG91 direct API when no flowId", async () => {
    process.env.MSG91_API_KEY = "test-key";
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => "" });

    const result = await sendSms({ phone: "9876543210", message: "Hello" });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.msg91.com/api/v2/sendsms",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns error on API failure", async () => {
    process.env.MSG91_API_KEY = "test-key";
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    const result = await sendSms({ phone: "9876543210", message: "Hello" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("msg91_error_500");
  });

  it("returns error on network failure", async () => {
    process.env.MSG91_API_KEY = "test-key";
    fetchMock.mockRejectedValueOnce(new Error("Network timeout"));

    const result = await sendSms({ phone: "9876543210", message: "Hello" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("sms_network_error");
  });
});
