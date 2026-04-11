import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hashToken,
  verifySecret,
  generateAccessToken,
  generateRefreshToken,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from "@/lib/oauth/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData().catch(() => null);
    const json = body ? null : await request.json().catch(() => null);

    const getValue = (key: string): string | null =>
      body?.get(key)?.toString() ?? (json as Record<string, string> | null)?.[key] ?? null;

    const grantType = getValue("grant_type");
    const clientId = getValue("client_id");
    const clientSecret = getValue("client_secret");
    const code = getValue("code");
    const redirectUri = getValue("redirect_uri");

    if (grantType !== "authorization_code") {
      return NextResponse.json(
        { error: "unsupported_grant_type", error_description: "Only authorization_code is supported." },
        { status: 400 },
      );
    }

    if (!clientId || !clientSecret || !code || !redirectUri) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing required parameters." },
        { status: 400 },
      );
    }

    const app = await db.oAuthApp.findUnique({ where: { clientId } });
    if (!app) {
      return NextResponse.json(
        { error: "invalid_client", error_description: "Unknown client." },
        { status: 401 },
      );
    }

    const secretValid = await verifySecret(clientSecret, app.clientSecret);
    if (!secretValid) {
      return NextResponse.json(
        { error: "invalid_client", error_description: "Invalid client credentials." },
        { status: 401 },
      );
    }

    if (!app.redirectUris.includes(redirectUri)) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Redirect URI mismatch." },
        { status: 400 },
      );
    }

    const codeHash = hashToken(code);
    const authorization = await db.oAuthAuthorization.findFirst({
      where: { authCode: codeHash, appId: app.id, isRevoked: false },
    });

    if (!authorization) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid or expired authorization code." },
        { status: 400 },
      );
    }

    // Nullify the auth code (single use)
    const newAccessToken = generateAccessToken();
    const newRefreshToken = generateRefreshToken();

    await db.oAuthAuthorization.update({
      where: { id: authorization.id },
      data: {
        authCode: null,
        accessToken: hashToken(newAccessToken),
        refreshToken: hashToken(newRefreshToken),
        accessExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
        refreshExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return NextResponse.json({
      access_token: newAccessToken,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      refresh_token: newRefreshToken,
      scope: authorization.scopes.join(" "),
    });
  } catch (err) {
    console.error("[oauth/token] Error:", err);
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error." },
      { status: 500 },
    );
  }
}
