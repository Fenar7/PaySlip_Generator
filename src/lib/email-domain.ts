import "server-only";

import { db } from "@/lib/db";

export async function addEmailDomain(
  orgId: string,
  emailDomain: string,
  defaultRole: string = "viewer",
  autoJoin: boolean = false
) {
  const normalized = emailDomain.toLowerCase().trim();

  return db.orgEmailDomain.create({
    data: {
      orgId,
      emailDomain: normalized,
      defaultRole,
      autoJoin,
    },
  });
}

export async function removeEmailDomain(orgId: string, emailDomain: string) {
  const normalized = emailDomain.toLowerCase().trim();

  return db.orgEmailDomain.delete({
    where: { orgId_emailDomain: { orgId, emailDomain: normalized } },
  });
}

export async function listEmailDomains(orgId: string) {
  return db.orgEmailDomain.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
  });
}

export async function findAutoJoinOrg(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  const match = await db.orgEmailDomain.findFirst({
    where: { emailDomain: domain, autoJoin: true },
    select: {
      orgId: true,
      defaultRole: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!match) return null;

  return {
    orgId: match.orgId,
    orgName: match.organization.name,
    orgSlug: match.organization.slug,
    defaultRole: match.defaultRole,
  };
}
