"use server";

import { db } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

export interface ProfileSettingsData {
  name: string;
  email: string;
}

export async function getProfileSettings(): Promise<ProfileSettingsData> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const profile = await db.profile.findUnique({
    where: { id: user.id },
    select: { name: true, email: true },
  });

  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

  return {
    name: profile?.name ?? metadataName,
    email: profile?.email ?? user.email ?? "",
  };
}

export async function saveProfileSettings(input: { name: string }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Full name is required.");
  }

  await db.profile.upsert({
    where: { id: user.id },
    update: {
      name,
      email: user.email ?? "",
    },
    create: {
      id: user.id,
      name,
      email: user.email ?? "",
    },
  });

  // Keep auth metadata aligned best-effort for surfaces that still read it,
  // but the persisted profile row is the primary source of truth.
  try {
    await supabase.auth.updateUser({ data: { name } });
  } catch {
    // Ignore metadata sync issues.
  }

  return { success: true };
}
