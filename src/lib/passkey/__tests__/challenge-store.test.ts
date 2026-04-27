import { describe, it, expect, vi, beforeEach } from "vitest";
import { storeChallenge, consumeChallenge, getAndConsumeChallenge, cleanupOldChallenges } from "../challenge-store";

vi.mock("@/lib/db", () => ({
  db: {
    webAuthnChallenge: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";

const mockDb = db.webAuthnChallenge as unknown as {
  create: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("storeChallenge", () => {
  it("creates a challenge row with expiry", async () => {
    mockDb.create.mockResolvedValue({ id: "ch_1" });
    await storeChallenge("user_1", "registration", "challenge_abc");
    expect(mockDb.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        purpose: "registration",
        challenge: "challenge_abc",
        consumed: false,
        expiresAt: expect.any(Date),
      }),
    });
  });
});

describe("consumeChallenge", () => {
  it("returns true when atomic claim succeeds and challenge matches", async () => {
    mockDb.findMany.mockResolvedValue([
      { id: "ch_1", challenge: "challenge_abc", consumed: false },
    ]);
    mockDb.updateMany.mockResolvedValue({ count: 1 });

    const result = await consumeChallenge("user_1", "registration", "challenge_abc");
    expect(result).toBe(true);
    expect(mockDb.updateMany).toHaveBeenCalledWith({
      where: { id: "ch_1", consumed: false },
      data: { consumed: true },
    });
  });

  it("returns false when challenge mismatches (single-use, still claimed)", async () => {
    mockDb.findMany.mockResolvedValue([
      { id: "ch_1", challenge: "challenge_real", consumed: false },
    ]);
    mockDb.updateMany.mockResolvedValue({ count: 1 });

    const result = await consumeChallenge("user_1", "registration", "challenge_fake");
    expect(result).toBe(false);
    // Claimed atomically — single-use guarantee
    expect(mockDb.updateMany).toHaveBeenCalledWith({
      where: { id: "ch_1", consumed: false },
      data: { consumed: true },
    });
  });

  it("returns false when no unconsumed challenge exists", async () => {
    mockDb.findMany.mockResolvedValue([]);

    const result = await consumeChallenge("user_1", "registration", "challenge_abc");
    expect(result).toBe(false);
    expect(mockDb.updateMany).not.toHaveBeenCalled();
  });

  it("returns false when no challenge exists for the requested purpose", async () => {
    mockDb.findMany.mockResolvedValue([]);

    const result = await consumeChallenge("user_1", "authentication", "challenge_abc");
    expect(result).toBe(false);
    expect(mockDb.updateMany).not.toHaveBeenCalled();
  });

  it("returns false when atomic claim fails (concurrent consumer already consumed)", async () => {
    // Simulate a race condition: another request consumes the challenge first
    mockDb.findMany.mockResolvedValue([
      { id: "ch_1", challenge: "challenge_abc", consumed: false },
    ]);
    // updateMany returns count 0 — someone else claimed it
    mockDb.updateMany.mockResolvedValue({ count: 0 });

    const result = await consumeChallenge("user_1", "registration", "challenge_abc");
    expect(result).toBe(false);
  });

  it("returns false for length-mismatch challenges (constant-time safety)", async () => {
    mockDb.findMany.mockResolvedValue([
      { id: "ch_1", challenge: "short", consumed: false },
    ]);
    mockDb.updateMany.mockResolvedValue({ count: 1 });

    const result = await consumeChallenge("user_1", "registration", "much_longer_challenge");
    expect(result).toBe(false);
  });
});

describe("getAndConsumeChallenge", () => {
  it("returns the challenge string on atomic claim success", async () => {
    mockDb.findMany.mockResolvedValue([
      { id: "ch_1", challenge: "challenge_xyz", consumed: false },
    ]);
    mockDb.updateMany.mockResolvedValue({ count: 1 });

    const result = await getAndConsumeChallenge("user_1", "registration");
    expect(result).toBe("challenge_xyz");
    expect(mockDb.updateMany).toHaveBeenCalledWith({
      where: { id: "ch_1", consumed: false },
      data: { consumed: true },
    });
  });

  it("returns null when no challenge exists", async () => {
    mockDb.findMany.mockResolvedValue([]);

    const result = await getAndConsumeChallenge("user_1", "registration");
    expect(result).toBeNull();
    expect(mockDb.updateMany).not.toHaveBeenCalled();
  });

  it("returns null when atomic claim fails (concurrent consumer)", async () => {
    mockDb.findMany.mockResolvedValue([
      { id: "ch_1", challenge: "challenge_xyz", consumed: false },
    ]);
    // Another request consumed it first
    mockDb.updateMany.mockResolvedValue({ count: 0 });

    const result = await getAndConsumeChallenge("user_1", "registration");
    expect(result).toBeNull();
  });
});

describe("cleanupOldChallenges", () => {
  it("deletes expired and old consumed challenges", async () => {
    mockDb.deleteMany.mockResolvedValue({ count: 5 });

    const result = await cleanupOldChallenges();
    expect(result).toBe(5);
    expect(mockDb.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { expiresAt: { lt: expect.any(Date) } },
          { consumed: true, createdAt: { lt: expect.any(Date) } },
        ],
      },
    });
  });
});