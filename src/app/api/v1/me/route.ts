import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/oauth/utils";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "unauthorized", error_description: "Missing or invalid Bearer token." },
        { status: 401 },
      );
    }

    const rawToken = authHeader.slice(7).trim();
    const tokenHash = hashToken(rawToken);

    const authorization = await db.oAuthAuthorization.findFirst({
      where: { accessToken: tokenHash, isRevoked: false },
      include: {
        app: { select: { name: true, clientId: true } },
      },
    });

    if (!authorization) {
      return NextResponse.json(
        { error: "unauthorized", error_description: "Invalid or expired token." },
        { status: 401 },
      );
    }

    if (authorization.accessExpiresAt && authorization.accessExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "unauthorized", error_description: "Token has expired." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      active: true,
      orgId: authorization.orgId,
      scopes: authorization.scopes,
      expiresAt: authorization.accessExpiresAt?.toISOString() ?? null,
      app: {
        name: authorization.app.name,
        clientId: authorization.app.clientId,
      },
    });
  } catch (err) {
    console.error("[api/v1/me] Error:", err);
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error." },
      { status: 500 },
    );
  }
}
