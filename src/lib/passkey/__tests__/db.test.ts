import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPasskeysForUser,
  getPasskeyByCredentialId,
  createPasskeyCredential,
  updatePasskeyCounter,
  renamePasskeyCredential,
  removePasskeyCredential,
  countPasskeysForUser,
} from "../db";

// Mock Prisma db client
vi.mock("@/lib/db", () => ({
  db: {
    passkeyCredential: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";

const mockDb = db.passkeyCredential as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPasskeysForUser", () => {
  it("returns passkeys ordered by createdAt desc", async () => {
    const userId = "user_1";
    const mockPasskeys = [
      { id: "pk_1", credentialId: "cred1", deviceName: "MacBook", createdAt: new Date() },
    ];
    mockDb.findMany.mockResolvedValue(mockPasskeys);

    const result = await getPasskeysForUser(userId);
    expect(mockDb.findMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: expect.any(Object),
    });
    expect(result).toEqual(mockPasskeys);
  });
});

describe("getPasskeyByCredentialId", () => {
  it("returns a passkey by credentialId", async () => {
    const credentialId = "cred_1";
    const mockPasskey = {
      id: "pk_1",
      credentialId,
      publicKey: Buffer.from([1, 2, 3]),
      counter: BigInt(0),
      userId: "user_1",
    };
    mockDb.findUnique.mockResolvedValue(mockPasskey);

    const result = await getPasskeyByCredentialId(credentialId);
    expect(mockDb.findUnique).toHaveBeenCalledWith({ where: { credentialId } });
    expect(result).toEqual(mockPasskey);
  });
});

describe("createPasskeyCredential", () => {
  it("creates a passkey with correct data", async () => {
    const userId = "user_1";
    const data = {
      credentialId: "cred_new",
      publicKey: new Uint8Array([1, 2, 3]),
      counter: BigInt(0),
      transports: ["internal"] as string[],
      deviceName: "Test Device",
      deviceType: "multiDevice",
      backedUp: true,
    };
    const mockCreated = { id: "pk_new", ...data, publicKey: Buffer.from(data.publicKey) };
    mockDb.create.mockResolvedValue(mockCreated);

    const result = await createPasskeyCredential(userId, data);
    expect(mockDb.create).toHaveBeenCalledWith({
      data: {
        userId,
        credentialId: data.credentialId,
        publicKey: Buffer.from(data.publicKey),
        counter: data.counter,
        transports: data.transports,
        deviceName: data.deviceName,
        deviceType: data.deviceType,
        backedUp: data.backedUp,
      },
    });
    expect(result).toEqual(mockCreated);
  });
});

describe("updatePasskeyCounter", () => {
  it("updates counter and lastUsedAt", async () => {
    const credentialId = "cred_1";
    const counter = BigInt(5);
    mockDb.update.mockResolvedValue({ id: "pk_1", counter });

    await updatePasskeyCounter(credentialId, counter);
    expect(mockDb.update).toHaveBeenCalledWith({
      where: { credentialId },
      data: {
        counter,
        lastUsedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
  });
});

describe("renamePasskeyCredential", () => {
  it("renames a passkey for the given user", async () => {
    const userId = "user_1";
    const id = "pk_1";
    const deviceName = "New Name";
    mockDb.updateMany.mockResolvedValue({ count: 1 });

    const result = await renamePasskeyCredential(userId, id, deviceName);
    expect(mockDb.updateMany).toHaveBeenCalledWith({
      where: { id, userId },
      data: { deviceName: "New Name", updatedAt: expect.any(Date) },
    });
    expect(result.count).toBe(1);
  });

  it("truncates long names to 100 chars", async () => {
    const longName = "a".repeat(200);
    mockDb.updateMany.mockResolvedValue({ count: 1 });

    await renamePasskeyCredential("user_1", "pk_1", longName);
    expect(mockDb.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deviceName: "a".repeat(100) }),
      })
    );
  });
});

describe("removePasskeyCredential", () => {
  it("removes a passkey for the given user", async () => {
    mockDb.deleteMany.mockResolvedValue({ count: 1 });

    const result = await removePasskeyCredential("user_1", "pk_1");
    expect(mockDb.deleteMany).toHaveBeenCalledWith({
      where: { id: "pk_1", userId: "user_1" },
    });
    expect(result.count).toBe(1);
  });
});

describe("countPasskeysForUser", () => {
  it("returns the count of passkeys for a user", async () => {
    mockDb.count.mockResolvedValue(3);

    const result = await countPasskeysForUser("user_1");
    expect(mockDb.count).toHaveBeenCalledWith({ where: { userId: "user_1" } });
    expect(result).toBe(3);
  });
});
