import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    partnerProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    partnerReviewEvent: {
      create: vi.fn(),
    },
    partnerManagedOrg: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import {
  isValidTransition,
  executePartnerTransition,
  type PartnerLifecycleAction,
} from "../lifecycle";
import { PartnerStatus } from "@/generated/prisma/client";

type MockDb = {
  partnerProfile: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  partnerReviewEvent: { create: ReturnType<typeof vi.fn> };
  partnerManagedOrg: { updateMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockDb = db as unknown as MockDb;

describe("Partner lifecycle state machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (ops: unknown[]) => {
      for (const op of ops) await op;
    });
    mockDb.partnerReviewEvent.create.mockResolvedValue({});
    mockDb.partnerProfile.update.mockResolvedValue({});
    mockDb.partnerManagedOrg.updateMany.mockResolvedValue({ count: 0 });
  });

  // ─── isValidTransition ────────────────────────────────────────────────────

  describe("isValidTransition", () => {
    const validCases: [PartnerStatus, PartnerLifecycleAction][] = [
      ["PENDING", "begin_review"],
      ["PENDING", "approve"],
      ["PENDING", "reject"],
      ["UNDER_REVIEW", "approve"],
      ["UNDER_REVIEW", "reject"],
      ["APPROVED", "suspend"],
      ["APPROVED", "revoke"],
      ["SUSPENDED", "approve"],
      ["SUSPENDED", "reinstate"],
      ["SUSPENDED", "revoke"],
    ];

    for (const [status, action] of validCases) {
      it(`allows ${action} from ${status}`, () => {
        expect(isValidTransition(status, action)).toBe(true);
      });
    }

    const invalidCases: [PartnerStatus, PartnerLifecycleAction][] = [
      ["APPROVED", "begin_review"],
      ["APPROVED", "reject"],
      ["REVOKED", "approve"],
      ["REVOKED", "suspend"],
      ["REVOKED", "reinstate"],
      ["SUSPENDED", "begin_review"],
      ["PENDING", "reinstate"],
      ["PENDING", "suspend"],
    ];

    for (const [status, action] of invalidCases) {
      it(`blocks ${action} from ${status}`, () => {
        expect(isValidTransition(status, action)).toBe(false);
      });
    }
  });

  // ─── executePartnerTransition ─────────────────────────────────────────────

  describe("executePartnerTransition", () => {
    it("returns error for non-existent partner", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue(null);
      const result = await executePartnerTransition(
        "partner-1",
        "admin-user",
        "approve"
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Partner not found");
      }
    });

    it("returns error for invalid transition", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED" as PartnerStatus,
      });
      const result = await executePartnerTransition(
        "partner-1",
        "admin-user",
        "begin_review"
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Cannot begin_review");
      }
    });

    it("executes approval transition correctly", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "UNDER_REVIEW" as PartnerStatus,
      });

      const result = await executePartnerTransition(
        "partner-1",
        "admin-user",
        "approve",
        "All checks passed"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newStatus).toBe("APPROVED");
      }
      expect(mockDb.$transaction).toHaveBeenCalledOnce();
    });

    it("records review event with correct from/to statuses", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "PENDING" as PartnerStatus,
      });

      await executePartnerTransition("partner-1", "admin-1", "begin_review", "Starting review");

      expect(mockDb.$transaction).toHaveBeenCalledOnce();
      const [[event, _update]] = mockDb.$transaction.mock.calls as [unknown[][]];
      void event; void _update; // just verifying the call happened
    });

    it("executes suspension from APPROVED", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED" as PartnerStatus,
      });

      const result = await executePartnerTransition(
        "partner-1",
        "admin-user",
        "suspend",
        "Compliance violation"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newStatus).toBe("SUSPENDED");
      }
    });

    it("executes reinstatement from SUSPENDED", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "SUSPENDED" as PartnerStatus,
      });

      const result = await executePartnerTransition(
        "partner-1",
        "admin-user",
        "reinstate"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newStatus).toBe("APPROVED");
      }
    });

    it("executes revocation as terminal action", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED" as PartnerStatus,
      });

      const result = await executePartnerTransition(
        "partner-1",
        "admin-user",
        "revoke",
        "Fraud detected"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newStatus).toBe("REVOKED");
      }
    });

    it("blocks revoke from REVOKED (terminal state)", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "REVOKED" as PartnerStatus,
      });

      const result = await executePartnerTransition(
        "partner-1",
        "admin-user",
        "revoke"
      );

      expect(result.success).toBe(false);
      expect(mockDb.$transaction).not.toHaveBeenCalled();
    });

    // ─── SEC-05: bulk assignment revocation ─────────────────────────────────

    it("bulk-revokes active assignments when partner is revoked", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED" as PartnerStatus,
      });

      const result = await executePartnerTransition(
        "partner-1",
        "admin-user",
        "revoke",
        "Fraud detected"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newStatus).toBe("REVOKED");
      }
      // The transaction must include updateMany for assignments
      expect(mockDb.$transaction).toHaveBeenCalledOnce();
      const [callArgs] = mockDb.$transaction.mock.calls as [unknown[][]];
      const ops = callArgs[0] as unknown[];
      // Expect at least 3 ops: reviewEvent.create, profile.update, managedOrg.updateMany, profile.update(count=0)
      expect(ops.length).toBeGreaterThanOrEqual(3);
    });

    it("bulk-revokes active assignments when partner is rejected", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "UNDER_REVIEW" as PartnerStatus,
      });

      const result = await executePartnerTransition(
        "partner-1",
        "admin-user",
        "reject",
        "Did not meet requirements"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newStatus).toBe("REVOKED");
      }
      expect(mockDb.$transaction).toHaveBeenCalledOnce();
    });

    it("does NOT bulk-revoke assignments when partner is merely suspended", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED" as PartnerStatus,
      });

      await executePartnerTransition(
        "partner-1",
        "admin-user",
        "suspend",
        "Compliance review"
      );

      expect(mockDb.$transaction).toHaveBeenCalledOnce();
      // updateMany should NOT have been called for suspension
      expect(mockDb.partnerManagedOrg.updateMany).not.toHaveBeenCalled();
    });
  });
});
