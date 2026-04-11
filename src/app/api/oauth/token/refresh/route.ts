import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hashToken,
  verifySecret,
  generateAccessToken,
  ACCESS_TOKEN_TTL_MS,
} from "@/lib/oauth/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData().catch(() => null);
    const json = body ? null : await request.json().catch(() => null);

    const getValue = (key: string): string | null =>
      body?.get(key)?.toString() ?? (json as Record<string, string> | null)?.[key] ?? null;

    const grantType = getValue("grant_type");
    const refreshToken = getValue("refresh_token");
    const clientId = getValue("client_id");
    const clientSecret = getValue("client_secret");

    if (grantType !== "refresh_token") {
      return NextResponse.json(
        { error: "unsupported_grant_type", error_description: "Only refresh_token is supported." },
        { status: 400 },
      );
    }

    if (!refreshToken || !clientId || !clientSecret) {
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

    const tokenHash = hashToken(refreshToken);
    const authorization = await db.oAuthAuthorization.findFirst({
      where: { refreshToken: tokenHash, appId: app.id, isRevoked: false },
    });

    if (!authorization) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid or expired refresh token." },
        { status: 400 },
      );
    }

    if (authorization.refreshExpiresAt && authorization.refreshExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Refresh token has expired." },
        { status: 400 },
      );
    }

    const newAccessToken = generateAccessToken();

    await db.oAuthAuthorization.update({
      where: { id: authorization.id },
      data: {
        accessToken: hashToken(newAccessToken),
        accessExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
      },
    });

    return NextResponse.json({
      access_token: newAccessToken,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      scope: authorization.scopes.join(" "),
    });
  } catch (err) {
    console.error("[oauth/token/refresh] Error:", err);
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error." },
      { status: 500 },
    );
  }
}
