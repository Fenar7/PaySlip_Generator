"use server";

import { db } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";
import { completeOnboardingStep } from "@/lib/onboarding-tracker";

export interface OrgWithRole {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: string;
}

export async function getOrgsForUser(userId: string): Promise<OrgWithRole[]> {
  const members = await db.member.findMany({
    where: { userId },
    include: { organization: true },
  });
  return members.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    logo: m.organization.logo,
    role: m.role,
  }));
}

export async function createOrg({
  name,
  slug,
}: {
  name: string;
  slug: string;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const userEmail = user.email ?? "";
  const userName = user.user_metadata?.full_name || user.user_metadata?.name || undefined;

  // Ensure a Profile row exists for this user before creating member FK
  await db.profile.upsert({
    where: { id: user.id },
    update: {
      email: userEmail,
      name: userName || userEmail.split("@")[0],
    },
    create: {
      id: user.id,
      email: userEmail,
      name: userName || userEmail.split("@")[0],
    },
  });

  const org = await db.organization.create({
    data: { name, slug },
  });
  await db.member.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: "owner",
    },
  });
  // Record the org setup milestone in the onboarding tracker.
  // Non-strict — org creation succeeds regardless of tracker write.
  await completeOnboardingStep(user.id, "orgSetup");
  return org;
}
