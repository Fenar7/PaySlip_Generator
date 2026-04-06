import "server-only";

import { db } from "@/lib/db";

export async function getUserOrgs(userId: string) {
  const memberships = await db.member.findMany({
    where: { userId },
    select: {
      role: true,
      createdAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => ({
    orgId: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
    joinedAt: m.createdAt,
  }));
}

export async function switchOrg(userId: string, orgId: string) {
  // Validate membership
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
  });
  if (!member) {
    throw new Error("You are not a member of this organization");
  }

  return db.userOrgPreference.upsert({
    where: { userId },
    create: { userId, activeOrgId: orgId },
    update: { activeOrgId: orgId },
  });
}

export async function getActiveOrg(userId: string) {
  const pref = await db.userOrgPreference.findUnique({
    where: { userId },
    select: {
      activeOrgId: true,
      org: { select: { id: true, name: true, slug: true } },
    },
  });

  if (pref) return pref.org;

  // Fallback: first membership
  const first = await db.member.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  return first?.organization ?? null;
}

export async function leaveOrg(userId: string, orgId: string) {
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
  });
  if (!member) {
    throw new Error("You are not a member of this organization");
  }
  if (member.role === "owner") {
    throw new Error("Organization owners cannot leave. Transfer ownership first.");
  }

  await db.member.delete({
    where: { organizationId_userId: { organizationId: orgId, userId } },
  });

  // If active org was the one being left, clear preference
  const pref = await db.userOrgPreference.findUnique({
    where: { userId },
  });
  if (pref?.activeOrgId === orgId) {
    const next = await db.member.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true },
    });
    if (next) {
      await db.userOrgPreference.update({
        where: { userId },
        data: { activeOrgId: next.organizationId },
      });
    } else {
      await db.userOrgPreference.delete({ where: { userId } });
    }
  }
}
