"use server";

import { requireOrgContext } from "@/lib/auth";
import { generateApiKey, listApiKeys, revokeApiKey } from "@/lib/api-keys";
import { logAudit } from "@/lib/audit";
import { VALID_SCOPES } from "@/lib/oauth/utils";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ApiKeyListItem = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  revokedAt: Date | null;
};

export type CreateApiKeyInput = {
  name: string;
  scopes: string[];
  expiresAt?: string | null;
};

export async function createToken(
  input: CreateApiKeyInput
): Promise<ActionResult<{ key: string; keyPrefix: string; id: string }>> {
  const { orgId, userId } = await requireOrgContext();

  const name = input.name.trim();
  if (!name) return { success: false, error: "Token name is required." };
  if (name.length > 80) return { success: false, error: "Token name must be 80 characters or fewer." };

  if (!input.scopes.length) return { success: false, error: "At least one scope is required." };
  const invalidScopes = input.scopes.filter(
    (s) => !(VALID_SCOPES as readonly string[]).includes(s)
  );
  if (invalidScopes.length) {
    return { success: false, error: `Invalid scopes: ${invalidScopes.join(", ")}` };
  }

  let expiresAt: Date | null = null;
  if (input.expiresAt) {
    const parsed = new Date(input.expiresAt);
    if (isNaN(parsed.getTime()) || parsed <= new Date()) {
      return { success: false, error: "Expiry date must be in the future." };
    }
    expiresAt = parsed;
  }

  const { key, keyId, keyPrefix } = await generateApiKey(
    orgId,
    name,
    input.scopes,
    expiresAt,
    userId
  );

  await logAudit({
    orgId,
    actorId: userId,
    action: "api_key.created",
    entityType: "ApiKey",
    entityId: keyId,
    metadata: { name, scopes: input.scopes },
  });

  return { success: true, data: { key, keyPrefix, id: keyId } };
}

export async function listTokens(): Promise<ActionResult<ApiKeyListItem[]>> {
  const { orgId } = await requireOrgContext();
  const keys = await listApiKeys(orgId);
  return { success: true, data: keys };
}

export async function revokeToken(
  tokenId: string
): Promise<ActionResult<null>> {
  const { orgId, userId } = await requireOrgContext();

  await revokeApiKey(tokenId, orgId);

  await logAudit({
    orgId,
    actorId: userId,
    action: "api_key.revoked",
    entityType: "ApiKey",
    entityId: tokenId,
    metadata: {},
  });

  return { success: true, data: null };
}
