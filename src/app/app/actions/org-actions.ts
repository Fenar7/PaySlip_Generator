"use server";

import { db } from "@/lib/db";

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
  userId,
}: {
  name: string;
  slug: string;
  userId: string;
}) {
  const org = await db.organization.create({
    data: { name, slug },
  });
  await db.member.create({
    data: {
      organizationId: org.id,
      userId,
      role: "owner",
    },
  });
  return org;
}
