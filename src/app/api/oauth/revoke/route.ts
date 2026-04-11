import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/oauth/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const token = body?.token;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing token parameter." },
        { status: 400 },
      );
    }

    const tokenHash = hashToken(token);

    // Try to find by access token first, then by refresh token
    const authorization = await db.oAuthAuthorization.findFirst({
      where: {
        OR: [{ accessToken: tokenHash }, { refreshToken: tokenHash }],
        isRevoked: false,
      },
    });

    if (authorization) {
      await db.oAuthAuthorization.update({
        where: { id: authorization.id },
        data: { isRevoked: true },
      });
    }

    // RFC 7009: always return 200, even if token not found
    return NextResponse.json({ revoked: true });
  } catch (err) {
    console.error("[oauth/revoke] Error:", err);
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error." },
      { status: 500 },
    );
  }
}
