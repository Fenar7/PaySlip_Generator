import "server-only";

import crypto from "crypto";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { redirect } from "next/navigation";

// ─── In-memory rate limit for magic link requests ────────────────────────────

const magicLinkAttempts = new Map<string, { count: number; resetAt: number }>();

const MAGIC_LINK_MAX_REQUESTS = 3;
const MAGIC_LINK_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkMagicLinkRateLimit(email: string): boolean {
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = magicLinkAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    magicLinkAttempts.set(key, { count: 1, resetAt: now + MAGIC_LINK_WINDOW_MS });
    return true;
  }

  if (entry.count >= MAGIC_LINK_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// ─── JWT helpers (HS256, no external library) ────────────────────────────────

function base64url(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64url");
}

interface PortalJwtPayload {
  customerId: string;
  orgId: string;
  orgSlug: string;
  iat: number;
  exp: number;
}

function getPortalJwtSecret(): string {
  const secret = process.env.PORTAL_JWT_SECRET;
  if (!secret) throw new Error("PORTAL_JWT_SECRET is not configured");
  return secret;
}

function signJwt(payload: Omit<PortalJwtPayload, "iat" | "exp">, expiresInSeconds = 86400): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: PortalJwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac("sha256", getPortalJwtSecret())
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

function verifyJwt(token: string): PortalJwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", getPortalJwtSecret())
      .update(`${header}.${body}`)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as PortalJwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;

    return payload;
  } catch {
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

const PORTAL_COOKIE = "portal_session";
const TOKEN_EXPIRY_HOURS = 24;
const SESSION_EXPIRY_SECONDS = 24 * 60 * 60;
const REFRESH_THRESHOLD_SECONDS = 4 * 60 * 60; // refresh if within last 4 hours

// ─── Public API ──────────────────────────────────────────────────────────────

const GENERIC_SUCCESS_MESSAGE = "If an account exists for this email, a login link has been sent.";

export async function requestMagicLink(
  email: string,
  orgSlug: string,
): Promise<{ success: true; message: string }> {
  // Always return the same response shape to prevent enumeration
  const successResponse = { success: true as const, message: GENERIC_SUCCESS_MESSAGE };

  if (!checkMagicLinkRateLimit(email)) {
    return successResponse;
  }

  try {
    const customer = await db.customer.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        organization: { slug: orgSlug },
      },
      include: {
        organization: {
          include: { defaults: true },
        },
      },
    });

    if (!customer || !customer.organization.defaults?.portalEnabled) {
      return successResponse;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Revoke any existing active tokens for this customer+org
    await db.customerPortalToken.updateMany({
      where: {
        customerId: customer.id,
        orgId: customer.organizationId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    await db.customerPortalToken.create({
      data: {
        orgId: customer.organizationId,
        customerId: customer.id,
        tokenHash,
        expiresAt,
      },
    });

    const baseUrl = getBaseUrl();
    const magicLinkUrl = `${baseUrl}/portal/${orgSlug}/auth/verify?token=${rawToken}&cid=${customer.id}`;

    const supportEmail = customer.organization.defaults?.portalSupportEmail;
    const orgName = customer.organization.name;

    await sendEmail({
      to: email,
      subject: `Sign in to your ${orgName} portal`,
      html: magicLinkEmailHtml({
        customerName: customer.name,
        orgName,
        url: magicLinkUrl,
        supportEmail: supportEmail ?? undefined,
      }),
    });

    logAudit({
      orgId: customer.organizationId,
      actorId: customer.id,
      action: "portal.magic_link_requested",
      entityType: "Customer",
      entityId: customer.id,
      metadata: { email },
    }).catch(() => {});
  } catch (error) {
    // Log but never leak errors to the caller (anti-enumeration)
    console.error("[portal-auth] Error in requestMagicLink:", error);
  }

  return successResponse;
}

export async function verifyMagicLink(
  rawToken: string,
  customerId: string,
  orgSlug: string,
): Promise<
  | { success: true; customerId: string; orgId: string }
  | { success: false; error: "invalid_or_expired_link" }
> {
  try {
    const tokenHash = sha256(rawToken);

    const portalToken = await db.customerPortalToken.findFirst({
      where: {
        tokenHash,
        customerId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        customer: {
          include: { organization: true },
        },
      },
    });

    if (!portalToken || portalToken.customer.organization.slug !== orgSlug) {
      return { success: false, error: "invalid_or_expired_link" };
    }

    const orgId = portalToken.orgId;

    // Mark token as used
    await db.customerPortalToken.update({
      where: { id: portalToken.id },
      data: { lastUsedAt: new Date() },
    });

    // Issue portal session cookie
    const jwt = signJwt({ customerId, orgId, orgSlug });
    const cookieStore = await cookies();
    cookieStore.set(PORTAL_COOKIE, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRY_SECONDS,
    });

    logAudit({
      orgId,
      actorId: customerId,
      action: "portal.magic_link_verified",
      entityType: "Customer",
      entityId: customerId,
    }).catch(() => {});

    return { success: true, customerId, orgId };
  } catch (error) {
    console.error("[portal-auth] Error in verifyMagicLink:", error);
    return { success: false, error: "invalid_or_expired_link" };
  }
}

export interface PortalSession {
  customerId: string;
  orgId: string;
  orgSlug: string;
}

export async function getPortalSession(): Promise<PortalSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(PORTAL_COOKIE)?.value;
    if (!token) return null;

    const payload = verifyJwt(token);
    if (!payload) return null;

    // Refresh token if within last 4 hours of expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp - now < REFRESH_THRESHOLD_SECONDS) {
      const refreshedJwt = signJwt({
        customerId: payload.customerId,
        orgId: payload.orgId,
        orgSlug: payload.orgSlug,
      });
      cookieStore.set(PORTAL_COOKIE, refreshedJwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_EXPIRY_SECONDS,
      });
    }

    return {
      customerId: payload.customerId,
      orgId: payload.orgId,
      orgSlug: payload.orgSlug,
    };
  } catch {
    return null;
  }
}

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) {
    // We don't know the orgSlug here, so redirect to a generic portal login
    redirect("/portal");
  }
  return session;
}

export async function revokePortalSession(customerId: string, orgId: string): Promise<void> {
  try {
    // Revoke all portal tokens for this customer+org
    await db.customerPortalToken.updateMany({
      where: {
        customerId,
        orgId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    // Clear session cookie
    const cookieStore = await cookies();
    cookieStore.delete(PORTAL_COOKIE);

    logAudit({
      orgId,
      actorId: customerId,
      action: "portal.session_revoked",
      entityType: "Customer",
      entityId: customerId,
    }).catch(() => {});
  } catch (error) {
    console.error("[portal-auth] Error in revokePortalSession:", error);
  }
}

export function logPortalAccess(params: {
  orgId: string;
  customerId: string;
  path: string;
  ip?: string;
  userAgent?: string;
}): void {
  // Fire-and-forget — never block the request
  db.customerPortalAccessLog
    .create({
      data: {
        orgId: params.orgId,
        customerId: params.customerId,
        path: params.path,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    })
    .catch((error) => {
      console.error("[portal-auth] Failed to log access:", error);
    });
}

// ─── Email template ──────────────────────────────────────────────────────────

function magicLinkEmailHtml(params: {
  customerName: string;
  orgName: string;
  url: string;
  supportEmail?: string;
}): string {
  const supportLine = params.supportEmail
    ? `<p style="color: #999; font-size: 12px; margin-top: 16px;">Need help? Contact <a href="mailto:${params.supportEmail}">${params.supportEmail}</a></p>`
    : "";

  return `
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;">Sign in to your portal</h1>
      <p style="color: #555; margin-bottom: 24px;">
        Hi ${params.customerName}, click the link below to access your ${params.orgName} customer portal.
        This link expires in ${TOKEN_EXPIRY_HOURS} hours.
      </p>
      <a href="${params.url}" style="display: inline-block; background: #dc2626; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
        Sign In to Portal
      </a>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
      ${supportLine}
    </div>
  `;
}
