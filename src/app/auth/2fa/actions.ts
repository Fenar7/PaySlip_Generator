"use server";

import { db } from "@/lib/db";
import { verifyTotpCode, decryptTotpSecret, findRecoveryCodeIndex } from "@/lib/totp";
import {
  signChallengeToken,
  TOTP_CHALLENGE_COOKIE,
  TOTP_SESSION_DURATION_SECONDS,
} from "@/lib/totp/challenge-session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

const MAX_AGE = TOTP_SESSION_DURATION_SECONDS;

/**
 * Verify a TOTP 6-digit code and, on success, issue the sw_2fa challenge
 * cookie. The callbackUrl (validated to be a relative path) is returned
 * so the client can redirect the user after the form action.
 */
export async function verifyTotpChallenge(
  code: string,
  rawCallbackUrl: string
): Promise<ActionResult<{ callbackUrl: string }>> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const profile = await db.profile.findUnique({
      where: { id: user.id },
      select: { totpSecret: true, totpEnabled: true },
    });

    // If TOTP is somehow not enabled in the DB (metadata desync), issue the
    // cookie immediately so the user is not stuck in an infinite loop.
    if (!profile?.totpEnabled || !profile.totpSecret) {
      await issueCookie(user.id);
      return { success: true, data: { callbackUrl: sanitizeCallbackUrl(rawCallbackUrl) } };
    }

    const plainSecret = decryptTotpSecret(profile.totpSecret);
    if (!verifyTotpCode(plainSecret, code)) {
      return { success: false, error: "Invalid code. Please try again." };
    }

    await issueCookie(user.id);
    return { success: true, data: { callbackUrl: sanitizeCallbackUrl(rawCallbackUrl) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Verification failed" };
  }
}

/**
 * Use a recovery code instead of a TOTP code. Consumes the code (one-time use).
 */
export async function verifyRecoveryChallenge(
  inputCode: string,
  rawCallbackUrl: string
): Promise<ActionResult<{ callbackUrl: string; codesRemaining: number }>> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const profile = await db.profile.findUnique({
      where: { id: user.id },
      select: { recoveryCodes: true, totpEnabled: true },
    });
    if (!profile?.totpEnabled) {
      return { success: false, error: "2FA is not enabled for this account" };
    }

    const storedHashes = (profile.recoveryCodes as string[] | null) ?? [];
    const idx = findRecoveryCodeIndex(inputCode, storedHashes);
    if (idx === -1) {
      return { success: false, error: "Invalid recovery code" };
    }

    const updated = storedHashes.filter((_, i) => i !== idx);
    await db.profile.update({
      where: { id: user.id },
      data: { recoveryCodes: updated },
    });

    await issueCookie(user.id);
    return {
      success: true,
      data: {
        callbackUrl: sanitizeCallbackUrl(rawCallbackUrl),
        codesRemaining: updated.length,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Recovery failed" };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function issueCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOTP_CHALLENGE_COOKIE, signChallengeToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Ensure the callback URL is a safe relative path and not an open redirect. */
function sanitizeCallbackUrl(raw: string): string {
  try {
    // Must start with / and must not be a protocol-relative URL
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      return raw;
    }
  } catch {
    // fall through
  }
  return "/app";
}

export { redirect };
