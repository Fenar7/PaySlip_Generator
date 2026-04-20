"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireOrgContext } from "@/lib/auth";
import {
  generateTotpSecret,
  verifyTotpCode,
  encryptTotpSecret,
  decryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  findRecoveryCodeIndex,
} from "@/lib/totp";
import {
  signChallengeToken,
  TOTP_CHALLENGE_COOKIE,
  TOTP_SESSION_DURATION_SECONDS,
} from "@/lib/totp/challenge-session";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const SECURITY_PATH = "/app/settings/security";

async function sync2faMetadata(
  userId: string,
  metadata: { totpEnabled: boolean; twoFaEnforcedByOrg: boolean }
) {
  const admin = await createSupabaseAdmin();
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  });
}

/** Initiate 2FA setup: generate secret, return URI for QR code display. */
export async function initiate2faSetup(): Promise<
  ActionResult<{ secret: string; uri: string; userId: string }>
> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const profile = await db.profile.findUnique({
      where: { id: user.id },
      select: { email: true, totpEnabled: true },
    });
    if (!profile) return { success: false, error: "Profile not found" };
    if (profile.totpEnabled) {
      return { success: false, error: "2FA is already enabled. Disable it first to re-enroll." };
    }

    const { secret, uri } = generateTotpSecret(profile.email);
    // Store the *unencrypted* secret temporarily on the profile so the verify step can use it.
    // It only becomes "active" once the user verifies a valid code.
    await db.profile.update({
      where: { id: user.id },
      data: { totpSecret: encryptTotpSecret(secret) },
    });

    return { success: true, data: { secret, uri, userId: user.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Setup failed" };
  }
}

/** Verify the TOTP code, mark 2FA as enabled, return plaintext recovery codes. */
export async function verify2faSetup(
  totpCode: string
): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const profile = await db.profile.findUnique({
      where: { id: user.id },
      select: { totpSecret: true, totpEnabled: true, twoFaEnforcedByOrg: true },
    });
    if (!profile?.totpSecret) {
      return { success: false, error: "No pending 2FA setup. Start setup again." };
    }
    if (profile.totpEnabled) {
      return { success: false, error: "2FA is already enabled" };
    }

    const plainSecret = decryptTotpSecret(profile.totpSecret);
    if (!verifyTotpCode(plainSecret, totpCode)) {
      return { success: false, error: "Invalid code. Please try again." };
    }

    const codes = generateRecoveryCodes();
    const hashed = codes.map(hashRecoveryCode);

    await db.profile.update({
      where: { id: user.id },
      data: {
        totpEnabled: true,
        totpEnabledAt: new Date(),
        recoveryCodes: hashed,
      },
    });

    // Sync totpEnabled flag into Supabase user_metadata so the Edge middleware
    // can read it from the JWT without a database round-trip.
    await sync2faMetadata(user.id, {
      totpEnabled: true,
      twoFaEnforcedByOrg: profile.twoFaEnforcedByOrg,
    });

    // Issue the challenge session cookie so the user is not immediately
    // redirected to the 2FA challenge page after completing setup.
    const cookieStore = await cookies();
    cookieStore.set(TOTP_CHALLENGE_COOKIE, signChallengeToken(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TOTP_SESSION_DURATION_SECONDS,
    });

    revalidatePath(SECURITY_PATH);
    return { success: true, data: { recoveryCodes: codes } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Verification failed" };
  }
}

/** Disable 2FA — requires the user's current password for re-authentication. */
export async function disable2fa(
  currentPassword: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: "Not authenticated" };

    // Re-authenticate to confirm identity before disabling 2FA
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (authError) {
      return { success: false, error: "Incorrect password. 2FA was not disabled." };
    }

    await db.profile.update({
      where: { id: user.id },
      data: {
        totpEnabled: false,
        totpSecret: null,
        totpEnabledAt: null,
        recoveryCodes: Prisma.JsonNull,
      },
    });

    // Sync flag into Supabase user_metadata and clear the challenge cookie.
    const existingProfile = await db.profile.findUnique({
      where: { id: user.id },
      select: { twoFaEnforcedByOrg: true },
    });

    await sync2faMetadata(user.id, {
      totpEnabled: false,
      twoFaEnforcedByOrg: existingProfile?.twoFaEnforcedByOrg ?? false,
    });
    const cookieStore = await cookies();
    cookieStore.delete(TOTP_CHALLENGE_COOKIE);

    revalidatePath(SECURITY_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to disable 2FA" };
  }
}

/** Enforce 2FA for all members of the org — owner only. */
export async function enforce2faForOrg(): Promise<ActionResult<void>> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { orgId } = await requireOrgContext();

    // Verify the caller is the org owner
    const member = await db.member.findFirst({
      where: { userId: user.id, organizationId: orgId, role: "owner" },
    });
    if (!member) {
      return { success: false, error: "Only the org owner can enforce 2FA for all members." };
    }

    // Mark all members' profiles as having 2FA enforced by org
    const members = await db.member.findMany({
      where: { organizationId: orgId },
      select: { userId: true },
    });

    await db.profile.updateMany({
      where: { id: { in: members.map((m) => m.userId) } },
      data: { twoFaEnforcedByOrg: true },
    });

    const profiles = await db.profile.findMany({
      where: { id: { in: members.map((m) => m.userId) } },
      select: { id: true, totpEnabled: true, twoFaEnforcedByOrg: true },
    });

    await Promise.all(
      profiles.map((profile) =>
        sync2faMetadata(profile.id, {
          totpEnabled: profile.totpEnabled,
          twoFaEnforcedByOrg: profile.twoFaEnforcedByOrg,
        })
      )
    );

    revalidatePath(SECURITY_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to enforce 2FA" };
  }
}

/** Get 2FA status for the current user. */
export async function get2faStatus(): Promise<
  ActionResult<{ totpEnabled: boolean; twoFaEnforcedByOrg: boolean }>
> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const profile = await db.profile.findUnique({
      where: { id: user.id },
      select: { totpEnabled: true, twoFaEnforcedByOrg: true },
    });
    if (!profile) return { success: false, error: "Profile not found" };

    return {
      success: true,
      data: {
        totpEnabled: profile.totpEnabled,
        twoFaEnforcedByOrg: profile.twoFaEnforcedByOrg,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load 2FA status",
    };
  }
}

/**
 * Verify and consume a recovery code from the security settings page.
 * Infers the user from the current session — use this in settings UI.
 */
export async function verifyRecoveryCode(
  inputCode: string,
): Promise<ActionResult<void>> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };
    return consumeRecoveryCode(user.id, inputCode);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Recovery code error" };
  }
}

/**
 * Consume a recovery code during login bypass.
 * Removes the used code from the stored hashes (one-time use).
 */
export async function consumeRecoveryCode(
  userId: string,
  inputCode: string
): Promise<ActionResult<void>> {
  try {
    const profile = await db.profile.findUnique({
      where: { id: userId },
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
      where: { id: userId },
      data: { recoveryCodes: updated },
    });

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Recovery code error" };
  }
}
