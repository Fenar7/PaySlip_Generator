import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ─── Mocks ─────────────────────────────────────────────────────────────────

const { mockRv, mockDoc, mockSendEmail } = vi.hoisted(() => {
  return {
    mockRv: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    mockDoc: {
      findUnique: vi.fn(),
    },
    mockSendEmail: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    recipientVerification: mockRv,
    sharedDocument: mockDoc,
  },
}));
vi.mock("@/lib/email", () => ({ sendEmail: mockSendEmail }));

import {
  issueRecipientVerification,
  verifyRecipientToken,
  isRecipientVerified,
  recordVerificationFailure,
} from "../recipient-verification";

// ─── Helpers ────────────────────────────────────────────────────────────────

function sha256(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function makePendingRecord(overrides: Partial<{
  id: string;
  status: string;
  expiresAt: Date;
  failureCount: number;
}> = {}) {
  return {
    id: "rv-1",
    tokenHash: "hash",
    sharedDocumentId: "doc-1",
    recipientEmail: "test@example.com",
    status: "PENDING",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    failureCount: 0,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("issueRecipientVerification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("expires existing PENDING verifications, creates a new record, and sends email", async () => {
    mockRv.updateMany.mockResolvedValue({ count: 1 });
    mockRv.create.mockResolvedValue({});
    mockDoc.findUnique.mockResolvedValue({
      docType: "invoice",
      shareToken: "tok123",
    });

    await issueRecipientVerification({
      sharedDocumentId: "doc-1",
      recipientEmail: "buyer@example.com",
      ip: "1.2.3.4",
    });

    expect(mockRv.updateMany).toHaveBeenCalledWith({
      where: { sharedDocumentId: "doc-1", recipientEmail: "buyer@example.com", status: "PENDING" },
      data: { status: "EXPIRED" },
    });

    expect(mockRv.create).toHaveBeenCalledOnce();
    const createData = mockRv.create.mock.calls[0][0].data;
    expect(createData.sharedDocumentId).toBe("doc-1");
    expect(createData.recipientEmail).toBe("buyer@example.com");
    expect(createData.ip).toBe("1.2.3.4");
    expect(typeof createData.tokenHash).toBe("string");
    expect(createData.tokenHash).toHaveLength(64); // SHA-256 hex

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const emailArgs = mockSendEmail.mock.calls[0][0];
    expect(emailArgs.to).toBe("buyer@example.com");
    expect(emailArgs.html).toContain("invoice");
    expect(emailArgs.html).toContain("tok123");
  });
});

describe("verifyRecipientToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ok: true and marks VERIFIED for a valid PENDING token", async () => {
    const raw = "a".repeat(64);
    const hash = sha256(raw);
    mockRv.findUnique.mockResolvedValue(makePendingRecord({ tokenHash: hash }));
    mockRv.update.mockResolvedValue({});

    const result = await verifyRecipientToken(raw, "5.6.7.8");

    expect(result.ok).toBe(true);
    expect(mockRv.update).toHaveBeenCalledWith({
      where: { id: "rv-1" },
      data: { status: "VERIFIED", verifiedAt: expect.any(Date), ip: "5.6.7.8" },
    });
  });

  it("returns invalid when token is not found", async () => {
    mockRv.findUnique.mockResolvedValue(null);
    const result = await verifyRecipientToken("nonexistent-token");
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("returns already_verified when status is VERIFIED", async () => {
    mockRv.findUnique.mockResolvedValue(makePendingRecord({ status: "VERIFIED" }));
    const result = await verifyRecipientToken("some-token");
    expect(result).toEqual({ ok: false, reason: "already_verified" });
  });

  it("returns expired when status is EXPIRED", async () => {
    mockRv.findUnique.mockResolvedValue(makePendingRecord({ status: "EXPIRED" }));
    mockRv.update.mockResolvedValue({});
    const result = await verifyRecipientToken("some-token");
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("returns expired when expiresAt is in the past", async () => {
    mockRv.findUnique.mockResolvedValue(
      makePendingRecord({ expiresAt: new Date(Date.now() - 1000) })
    );
    mockRv.update.mockResolvedValue({});
    const result = await verifyRecipientToken("some-token");
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("returns max_failures when failureCount >= 5", async () => {
    mockRv.findUnique.mockResolvedValue(makePendingRecord({ failureCount: 5 }));
    const result = await verifyRecipientToken("some-token");
    expect(result).toEqual({ ok: false, reason: "max_failures" });
  });
});

describe("isRecipientVerified", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when a VERIFIED record exists", async () => {
    mockRv.findFirst.mockResolvedValue({ id: "rv-1" });
    const result = await isRecipientVerified("doc-1", "buyer@example.com");
    expect(result).toBe(true);
    expect(mockRv.findFirst).toHaveBeenCalledWith({
      where: { sharedDocumentId: "doc-1", recipientEmail: "buyer@example.com", status: "VERIFIED" },
      select: { id: true },
    });
  });

  it("returns false when no VERIFIED record exists", async () => {
    mockRv.findFirst.mockResolvedValue(null);
    const result = await isRecipientVerified("doc-1", "buyer@example.com");
    expect(result).toBe(false);
  });
});

describe("recordVerificationFailure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("increments failureCount for the matching token", async () => {
    mockRv.update.mockResolvedValue({});
    const raw = "b".repeat(64);
    await recordVerificationFailure(raw);
    expect(mockRv.update).toHaveBeenCalledWith({
      where: { tokenHash: sha256(raw) },
      data: { failureCount: { increment: 1 } },
    });
  });

  it("silently ignores missing tokens (catches db error)", async () => {
    mockRv.update.mockRejectedValue(new Error("Record not found"));
    await expect(recordVerificationFailure("unknown-raw-token")).resolves.not.toThrow();
  });
});
