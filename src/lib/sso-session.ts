import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export type SsoSessionMode = "sso" | "break_glass";

interface SsoSessionPayload {
  orgId: string;
  userId: string;
  mode: SsoSessionMode;
  exp: number;
  iat: number;
}

export const SSO_SESSION_COOKIE_NAME = "slipwise-sso-session";

export const SSO_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const SSO_BREAK_GLASS_TTL_MS = 1000 * 60 * 15;

function getSsoSessionSecret(): string {
  const secret =
    env.SSO_SESSION_SECRET ?? env.PORTAL_JWT_SECRET ?? env.CRON_SECRET;

  if (!secret) {
    throw new Error(
      "SSO session signing secret is not configured. Set SSO_SESSION_SECRET, PORTAL_JWT_SECRET, or CRON_SECRET.",
    );
  }

  return secret;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function signPayload(payload: string): string {
  return crypto
    .createHmac("sha256", getSsoSessionSecret())
    .update(payload)
    .digest("base64url");
}

function encodeSession(payload: SsoSessionPayload): string {
  const body = encodeBase64Url(JSON.stringify(payload));
  return `${body}.${signPayload(body)}`;
}

function decodeSession(token: string | undefined): SsoSessionPayload | null {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expectedSignature = signPayload(body);
  const providedSignature = Buffer.from(signature, "base64url");
  const actualSignature = Buffer.from(expectedSignature, "base64url");

  if (
    providedSignature.length !== actualSignature.length ||
    !crypto.timingSafeEqual(providedSignature, actualSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(body)) as SsoSessionPayload;
    if (
      typeof payload.orgId !== "string" ||
      typeof payload.userId !== "string" ||
      (payload.mode !== "sso" && payload.mode !== "break_glass") ||
      typeof payload.exp !== "number" ||
      typeof payload.iat !== "number"
    ) {
      return null;
    }

    if (payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function setSsoSessionCookie(
  response: NextResponse,
  input: { orgId: string; userId: string; mode: SsoSessionMode; ttlMs?: number },
): void {
  const ttlMs =
    input.ttlMs ??
    (input.mode === "break_glass"
      ? SSO_BREAK_GLASS_TTL_MS
      : SSO_SESSION_TTL_MS);

  const payload: SsoSessionPayload = {
    orgId: input.orgId,
    userId: input.userId,
    mode: input.mode,
    iat: Date.now(),
    exp: Date.now() + ttlMs,
  };

  response.cookies.set(SSO_SESSION_COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: new Date(payload.exp),
  });
}

export function clearSsoSessionCookie(response: NextResponse): void {
  response.cookies.set(SSO_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function readSsoSessionCookie(): Promise<SsoSessionPayload | null> {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SSO_SESSION_COOKIE_NAME)?.value);
}
