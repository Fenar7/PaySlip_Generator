import "server-only";
import { db } from "@/lib/db";

export async function getPasskeysForUser(userId: string) {
  return db.passkeyCredential.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      credentialId: true,
      deviceName: true,
      deviceType: true,
      backedUp: true,
      transports: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getPasskeyByCredentialId(credentialId: string) {
  return db.passkeyCredential.findUnique({
    where: { credentialId },
  });
}

export async function createPasskeyCredential(
  userId: string,
  data: {
    credentialId: string;
    publicKey: Uint8Array;
    counter: bigint;
    transports: string[];
    deviceName?: string;
    deviceType?: string;
    backedUp?: boolean;
  }
) {
  return db.passkeyCredential.create({
    data: {
      userId,
      credentialId: data.credentialId,
      publicKey: Buffer.from(data.publicKey),
      counter: data.counter,
      transports: data.transports,
      deviceName: data.deviceName ?? null,
      deviceType: data.deviceType ?? null,
      backedUp: data.backedUp ?? false,
    },
  });
}

export async function updatePasskeyCounter(credentialId: string, counter: bigint) {
  return db.passkeyCredential.update({
    where: { credentialId },
    data: {
      counter,
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function renamePasskeyCredential(
  userId: string,
  id: string,
  deviceName: string
) {
  return db.passkeyCredential.updateMany({
    where: { id, userId },
    data: { deviceName: deviceName.slice(0, 100), updatedAt: new Date() },
  });
}

export async function removePasskeyCredential(userId: string, id: string) {
  return db.passkeyCredential.deleteMany({
    where: { id, userId },
  });
}

export async function countPasskeysForUser(userId: string): Promise<number> {
  return db.passkeyCredential.count({ where: { userId } });
}
