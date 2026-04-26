"use server";

import { db } from "@/lib/db";
import { verifyTotpCode, decryptTotpSecret, findRecoveryCodeIndex } from "@/lib/totp";
import {
  signChallengeToken,
  MFA_CHALLENGE_COOKIE,
  MFA_SESSION_DURATION_SECONDS,
} from "@/lib/totp/challenge-session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getPasskeysForUser,
  getPasskeyByCredentialId,
  updatePasskeyCounter,
} from "@/lib/passkey/db";
import { verifyAuthentication } from "@/lib/passkey/server";
import { logAudit } from "@/lib/audit";
import type { AuthenticationResponseJSON } from "@simplewebauthn/browser";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

const MAX_AGE = MFA_SESSION_DURATION_SECONDS;

async function issueCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(MFA_CHALLENGE_COOKIE, signChallengeToken(userId), {
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
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      return raw;
    }
  } catch {
    // fall through
  }
  return "/app";
}

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

    if (!profile?.totpEnabled || !profile.totpSecret) {
      return {
        success: false,
        error:
          "Two-factor authentication is not configured for this account. Complete enrollment from Security Settings first.",
      };
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
 * Recovery codes are a general MFA fallback — available when the user has
 * recovery codes stored, regardless of whether TOTP or passkey is the primary factor.
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
      select: { recoveryCodes: true, totpEnabled: true, passkeyEnabled: true },
    });

    const hasMfa = profile?.totpEnabled || profile?.passkeyEnabled;
    if (!hasMfa) {
      return { success: false, error: "MFA is not enabled for this account" };
    }

    const storedHashes = (profile.recoveryCodes as string[] | null) ?? [];
    if (storedHashes.length === 0) {
      return { success: false, error: "No recovery codes available" };
    }

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

/**
 * Verify a passkey authentication response for MFA challenge.
 */
export async function verifyPasskeyChallenge(
  response: AuthenticationResponseJSON,
  rawCallbackUrl: string
): Promise<ActionResult<{ callbackUrl: string }>> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const credentialId = response.id;
    const credential = await getPasskeyByCredentialId(credentialId);
    if (!credential || credential.userId !== user.id) {
      return { success: false, error: "Unknown passkey credential" };
    }

    const verification = await verifyAuthentication(user.id, response, {
      credentialId: credential.credentialId,
      publicKey: new Uint8Array(credential.publicKey),
      counter: credential.counter,
    });

    if (!verification.verified) {
      // Best-effort audit of failed passkey challenge
      try {
        const member = await db.member.findFirst({
          where: { userId: user.id },
          select: { organizationId: true },
        });
        if (member) {
          await logAudit({
            orgId: member.organizationId,
            actorId: user.id,
            action: "passkey.challenge_failed",
            entityType: "PasskeyCredential",
            entityId: credential.id,
            metadata: { purpose: "mfa_challenge", reason: "verification_failed" },
          });
        }
      } catch {
        // ignore audit failures
      }
      return { success: false, error: "Passkey verification failed" };
    }

    if (verification.authenticationInfo) {
      await updatePasskeyCounter(credential.credentialId, BigInt(verification.authenticationInfo.newCounter));
    }

    await issueCookie(user.id);
    return { success: true, data: { callbackUrl: sanitizeCallbackUrl(rawCallbackUrl) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Passkey challenge failed" };
  }
}

/**
 * Get the enrolled MFA factors for the current user.
 * Used by the MFA challenge page to decide which UI to show.
 */
export async function getMfaFactors(): Promise<
  ActionResult<{
    hasPasskey: boolean;
    hasTotp: boolean;
    hasRecoveryCodes: boolean;
  }>
> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const profile = await db.profile.findUnique({
      where: { id: user.id },
      select: { totpEnabled: true, recoveryCodes: true },
    });
    const passkeys = await getPasskeysForUser(user.id);

    const storedHashes = (profile?.recoveryCodes as string[] | null) ?? [];

    return {
      success: true,
      data: {
        hasPasskey: passkeys.length > 0,
        hasTotp: profile?.totpEnabled ?? false,
        hasRecoveryCodes: storedHashes.length > 0,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load factors" };
  }
}

export { redirect };
