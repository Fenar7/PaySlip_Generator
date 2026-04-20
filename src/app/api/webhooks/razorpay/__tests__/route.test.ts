import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHmac } from "crypto";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    orgIntegration: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    razorpayEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    invoice: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    invoicePayment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    invoiceStateEvent: {
      create: vi.fn(),
    },
    unmatchedPayment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    customerVirtualAccount: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn({
      invoicePayment: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
      invoice: { update: vi.fn() },
      invoiceStateEvent: { create: vi.fn() },
    })),
  },
}));

vi.mock("@/lib/usage-metering", () => ({
  recordUsageEvent: vi.fn(),
}));

vi.mock("@/lib/crypto/gateway-secrets", () => ({
  timingSafeStringEqual: (a: string, b: string) => a === b,
  encryptGatewaySecret: (s: string) => `iv:${s}`,
  decryptGatewaySecret: (s: string) => s.replace("iv:", ""),
}));

vi.mock("@/lib/razorpay/client", () => ({
  getOrgConfigByRazorpayAccountId: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { POST } from "../route";
import { db } from "@/lib/db";

const WEBHOOK_SECRET = "test_webhook_secret_123";
const ORG_ID = "org_test_001";

function buildSignedRequest(body: object, secret = WEBHOOK_SECRET): NextRequest {
  const rawBody = JSON.stringify(body);
  const sig = createHmac("sha256", secret).update(rawBody).digest("hex");
  return new NextRequest("http://localhost/api/webhooks/razorpay", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": sig,
      "x-razorpay-event-id": "evt_test_001",
    },
    body: rawBody,
  });
}

describe("POST /api/webhooks/razorpay", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

    // Default: org found via fallback
    vi.mocked(db.orgIntegration.findFirst).mockResolvedValue({ orgId: ORG_ID } as never);
    vi.mocked(db.orgIntegration.findMany).mockResolvedValue([{ orgId: ORG_ID }] as never);
    vi.mocked(db.razorpayEvent.findUnique).mockResolvedValue(null);
    vi.mocked(db.razorpayEvent.create).mockResolvedValue({ id: "evt_test_001", type: "payment_link.paid", payload: {}, processedAt: new Date() });
    vi.mocked(db.invoice.findFirst).mockResolvedValue(null);
    vi.mocked(db.unmatchedPayment.findFirst).mockResolvedValue(null);
  });

  it("returns 200 with ok:true for valid signed events", async () => {
    const payload = { event: "payment_link.paid", account_id: "", payload: {} };
    const req = buildSignedRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("returns 200 with ok:false for invalid signature", async () => {
    const rawBody = JSON.stringify({ event: "payment_link.paid", account_id: "", payload: {} });
    const req = new NextRequest("http://localhost/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": "badsignature",
      },
      body: rawBody,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(false);
  });

  it("returns 200 with skipped:true for duplicate event id", async () => {
    vi.mocked(db.razorpayEvent.findUnique).mockResolvedValue({
      id: "evt_test_001",
      type: "payment_link.paid",
      payload: {},
      processedAt: new Date(),
    });
    const payload = { event: "payment_link.paid", account_id: "", payload: {} };
    const req = buildSignedRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean; skipped?: boolean };
    expect(json.skipped).toBe(true);
  });

  it("returns 200 with ok:false when no org can be found", async () => {
    vi.mocked(db.orgIntegration.findFirst).mockResolvedValue(null);
    vi.mocked(db.orgIntegration.findMany).mockResolvedValue([] as never);
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const payload = { event: "payment_link.paid", account_id: "", payload: {} };
    const req = buildSignedRequest(payload, WEBHOOK_SECRET);
    const res = await POST(req);
    expect(res.status).toBe(200);
    // Without a matching org or secret, we cannot verify → ok false
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(false);
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  it("returns 200 even when the body is not valid JSON", async () => {
    const sig = createHmac("sha256", WEBHOOK_SECRET).update("not-json").digest("hex");
    const req = new NextRequest("http://localhost/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": sig,
      },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("persists a RazorpayEvent record on valid events", async () => {
    const payload = { event: "payment_link.expired", account_id: "", payload: { payment_link: { id: "pl_abc" } } };
    const req = buildSignedRequest(payload);
    await POST(req);
    expect(vi.mocked(db.razorpayEvent.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ id: "evt_test_001", type: "payment_link.expired" }) })
    );
  });
});
