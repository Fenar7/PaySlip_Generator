import { describe, it, expect, vi, beforeEach } from "vitest";
import { storeChallenge, consumeChallenge, getAndConsumeChallenge, cleanupOldChallenges } from "../challenge-store";

vi.mock("@/lib/db", () => ({
  db: {
    webAuthnChallenge: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";

const mockDb = db.webAuthnChallenge as unknown as {
  create: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
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
  it("returns true and marks consumed when challenge matches", async () => {
    mockDb.findMany.mockResolvedValue([
      { id: "ch_1", challenge: "challenge_abc", consumed: false },
    ]);
    mockDb.update.mockResolvedValue({});

    const result = await consumeChallenge("user_1", "registration", "challenge_abc");
    expect(result).toBe(true);
    expect(mockDb.update).toHaveBeenCalledWith({
      where: { id: "ch_1" },
      data: { consumed: true },
    });
  });

  it("returns false and still marks consumed when challenge mismatches (single-use)", async () => {
    mockDb.findMany.mockResolvedValue([
      { id: "ch_1", challenge: "challenge_real", consumed: false },
    ]);
    mockDb.update.mockResolvedValue({});

    const result = await consumeChallenge("user_1", "registration", "challenge_fake");
    expect(result).toBe(false);
    expect(mockDb.update).toHaveBeenCalledWith({
      where: { id: "ch_1" },
      data: { consumed: true },
    });
  });

  it("returns false when no unconsumed challenge exists", async () => {
    mockDb.findMany.mockResolvedValue([]);

    const result = await consumeChallenge("user_1", "registration", "challenge_abc");
    expect(result).toBe(false);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("returns false when no challenge exists for the requested purpose", async () => {
    mockDb.findMany.mockResolvedValue([]);

    const result = await consumeChallenge("user_1", "authentication", "challenge_abc");
    expect(result).toBe(false);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe("getAndConsumeChallenge", () => {
  it("returns the challenge string on success", async () => {
    mockDb.findMany.mockResolvedValue([
      { id: "ch_1", challenge: "challenge_xyz", consumed: false },
    ]);
    mockDb.update.mockResolvedValue({});

    const result = await getAndConsumeChallenge("user_1", "registration");
    expect(result).toBe("challenge_xyz");
    expect(mockDb.update).toHaveBeenCalledWith({
      where: { id: "ch_1" },
      data: { consumed: true },
    });
  });

  it("returns null when no challenge exists", async () => {
    mockDb.findMany.mockResolvedValue([]);

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
