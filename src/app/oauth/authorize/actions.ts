"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import {
  generateAuthCode,
  hashToken,
  validateScopes,
  validateRedirectUri,
  AUTH_CODE_TTL_MS,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  VALID_SCOPES,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/oauth/utils";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const SCOPE_LABELS: Record<string, string> = {
  "invoices:read": "View invoices",
  "invoices:write": "Create and edit invoices",
  "customers:read": "View customers",
  "customers:write": "Create and edit customers",
  "vouchers:read": "View vouchers",
  "quotes:read": "View quotes",
  "reports:read": "View reports",
  "webhooks:read": "View webhook configurations",
  "webhooks:write": "Manage webhook configurations",
};

export async function getAuthorizationRequest(
  clientId: string,
  redirectUri: string,
  scopes: string,
  state: string,
): Promise<
  ActionResult<{
    appName: string;
    appDescription: string | null;
    scopes: Array<{ key: string; label: string }>;
    clientId: string;
    redirectUri: string;
    state: string;
  }>
> {
  try {
    const app = await db.oAuthApp.findUnique({ where: { clientId } });
    if (!app) {
      return { success: false, error: "Unknown application." };
    }

    const requestedScopes = scopes.split(" ").filter(Boolean);
    if (!validateScopes(requestedScopes)) {
      return { success: false, error: "Invalid scopes requested." };
    }

    if (!validateRedirectUri(redirectUri, app.redirectUris)) {
      return { success: false, error: "Invalid redirect URI." };
    }

    const scopeDetails = requestedScopes.map((s) => ({
      key: s,
      label: SCOPE_LABELS[s] ?? s,
    }));

    return {
      success: true,
      data: {
        appName: app.name,
        appDescription: app.description,
        scopes: scopeDetails,
        clientId,
        redirectUri,
        state,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to validate request.",
    };
  }
}

export async function approveAuthorization(
  clientId: string,
  redirectUri: string,
  scopes: string,
  state: string,
): Promise<ActionResult<{ redirectUrl: string }>> {
  try {
    const ctx = await requireOrgContext();

    const app = await db.oAuthApp.findUnique({ where: { clientId } });
    if (!app) {
      return { success: false, error: "Unknown application." };
    }

    const requestedScopes = scopes.split(" ").filter(Boolean);
    if (!validateScopes(requestedScopes)) {
      return { success: false, error: "Invalid scopes." };
    }
    if (!validateRedirectUri(redirectUri, app.redirectUris)) {
      return { success: false, error: "Invalid redirect URI." };
    }

    const code = generateAuthCode();
    const accessTokenRaw = generateAccessToken();
    const refreshTokenRaw = generateRefreshToken();

    // Check for existing authorization and update or create
    const existing = await db.oAuthAuthorization.findFirst({
      where: { appId: app.id, orgId: ctx.orgId, grantedBy: ctx.userId, isRevoked: false },
    });

    const authData = {
      scopes: requestedScopes,
      authCode: hashToken(code),
      accessToken: hashToken(accessTokenRaw),
      refreshToken: hashToken(refreshTokenRaw),
      accessExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
      refreshExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      isRevoked: false,
    };

    if (existing) {
      await db.oAuthAuthorization.update({
        where: { id: existing.id },
        data: authData,
      });
    } else {
      await db.oAuthAuthorization.create({
        data: {
          appId: app.id,
          orgId: ctx.orgId,
          grantedBy: ctx.userId,
          ...authData,
        },
      });
    }

    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    url.searchParams.set("state", state);
    return { success: true, data: { redirectUrl: url.toString() } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Authorization failed.",
    };
  }
}

export async function denyAuthorization(
  redirectUri: string,
  state: string,
): Promise<ActionResult<{ redirectUrl: string }>> {
  try {
    const url = new URL(redirectUri);
    url.searchParams.set("error", "access_denied");
    url.searchParams.set("state", state);
    return { success: true, data: { redirectUrl: url.toString() } };
  } catch {
    return { success: false, error: "Invalid redirect URI." };
  }
}
