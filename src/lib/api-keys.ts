import "server-only";

import crypto from "crypto";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";

const KEY_PREFIX = "slw_live_";

function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export async function generateApiKey(
  orgId: string,
  name: string,
  scopes: string[],
  expiresAt?: Date | null,
  createdBy?: string
): Promise<{ key: string; keyId: string; keyPrefix: string }> {
  const rawKey = KEY_PREFIX + nanoid(32);
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const apiKey = await db.apiKey.create({
    data: {
      orgId,
      name,
      keyHash,
      keyPrefix,
      scopes,
      expiresAt: expiresAt ?? null,
      createdBy: createdBy ?? "",
    },
  });

  return { key: rawKey, keyId: apiKey.id, keyPrefix };
}

export async function validateApiKey(
  rawKey: string
): Promise<{ orgId: string; apiKeyId: string; scopes: string[] } | null> {
  const keyHash = hashKey(rawKey);

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey) return null;
  if (!apiKey.isActive) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Fire-and-forget last used update
  updateLastUsed(apiKey.id);

  return {
    orgId: apiKey.orgId,
    apiKeyId: apiKey.id,
    scopes: apiKey.scopes,
  };
}

export async function revokeApiKey(
  keyId: string,
  orgId: string
): Promise<void> {
  await db.apiKey.updateMany({
    where: { id: keyId, orgId },
    data: { isActive: false, revokedAt: new Date() },
  });
}

export async function listApiKeys(orgId: string) {
  return db.apiKey.findMany({
    where: { orgId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      isActive: true,
      createdBy: true,
      createdAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export function updateLastUsed(keyId: string): void {
  db.apiKey
    .update({
      where: { id: keyId },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // fire-and-forget — silently ignore errors
    });
}
