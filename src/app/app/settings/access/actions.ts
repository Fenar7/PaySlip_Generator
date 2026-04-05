"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { proxyGrantedEmailHtml } from "@/lib/email-templates/proxy-granted-email";
import { revalidatePath } from "next/cache";

type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

// ── helpers ──────────────────────────────────────────────────────────

// ── getProxyGrants ──────────────────────────────────────────────────
export async function getProxyGrants() {
  const { orgId } = await requireRole("admin");

  // Lazy-expire active grants that have passed their expiry
  await db.proxyGrant.updateMany({
    where: { orgId, status: "ACTIVE", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });

  const grants = await db.proxyGrant.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  // Collect unique profile IDs for actor / represented
  const profileIds = [
    ...new Set(grants.flatMap((g) => [g.actorId, g.representedId])),
  ];
  const profiles = await db.profile.findMany({
    where: { id: { in: profileIds } },
    select: { id: true, name: true, email: true },
  });
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  return grants.map((g) => ({
    ...g,
    actorName: profileMap[g.actorId]?.name ?? "Unknown",
    actorEmail: profileMap[g.actorId]?.email ?? "",
    representedName: profileMap[g.representedId]?.name ?? "Unknown",
    representedEmail: profileMap[g.representedId]?.email ?? "",
  }));
}

// ── createProxyGrant ────────────────────────────────────────────────
export async function createProxyGrant(data: {
  actorId: string;
  representedId: string;
  scope: string[];
  reason: string;
  expiresAt: string;
}): Promise<ActionResult> {
  const { userId, orgId } = await requireRole("admin");

  // Validations
  if (data.actorId === data.representedId) {
    return { success: false, error: "Actor and represented cannot be the same person." };
  }
  if (!data.reason || data.reason.trim().length < 10) {
    return { success: false, error: "Reason must be at least 10 characters." };
  }
  if (!data.scope.length) {
    return { success: false, error: "At least one scope must be selected." };
  }

  const expiresAt = new Date(data.expiresAt);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  if (expiresAt > maxDate) {
    return { success: false, error: "Maximum proxy duration is 90 days." };
  }
  if (expiresAt <= new Date()) {
    return { success: false, error: "Expiry date must be in the future." };
  }

  const grant = await db.proxyGrant.create({
    data: {
      orgId,
      actorId: data.actorId,
      representedId: data.representedId,
      scope: data.scope,
      reason: data.reason.trim(),
      grantedBy: userId,
      expiresAt,
      status: "ACTIVE",
    },
  });

  // Audit
  logAudit({
    orgId,
    actorId: userId,
    action: "proxy.granted",
    entityType: "ProxyGrant",
    entityId: grant.id,
    metadata: {
      actorId: data.actorId,
      representedId: data.representedId,
      scope: data.scope,
    },
  });

  // Email notification to actor
  try {
    const [actorProfile, representedProfile, org] = await Promise.all([
      db.profile.findUnique({ where: { id: data.actorId }, select: { name: true, email: true } }),
      db.profile.findUnique({ where: { id: data.representedId }, select: { name: true } }),
      db.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    ]);

    if (actorProfile?.email) {
      await sendEmail({
        to: actorProfile.email,
        subject: `Proxy access granted – ${org?.name ?? "Your organization"}`,
        html: proxyGrantedEmailHtml({
          actorName: actorProfile.name,
          representedName: representedProfile?.name ?? "Unknown",
          scope: data.scope,
          expiresAt: expiresAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          reason: data.reason.trim(),
          orgName: org?.name ?? "Your organization",
        }),
      });
    }
  } catch (e) {
    console.error("[PROXY] Email notification failed:", e);
  }

  revalidatePath("/app/settings/access");
  return { success: true, id: grant.id };
}

// ── revokeProxyGrant ────────────────────────────────────────────────
export async function revokeProxyGrant(
  proxyGrantId: string
): Promise<ActionResult> {
  const { userId, orgId } = await requireRole("admin");

  const grant = await db.proxyGrant.findFirst({
    where: { id: proxyGrantId, orgId },
  });
  if (!grant) {
    return { success: false, error: "Proxy grant not found." };
  }
  if (grant.status !== "ACTIVE") {
    return { success: false, error: "Only active grants can be revoked." };
  }

  await db.proxyGrant.update({
    where: { id: proxyGrantId },
    data: { status: "REVOKED", revokedAt: new Date(), revokedBy: userId },
  });

  logAudit({
    orgId,
    actorId: userId,
    action: "proxy.revoked",
    entityType: "ProxyGrant",
    entityId: proxyGrantId,
    metadata: {
      actorId: grant.actorId,
      representedId: grant.representedId,
    },
  });

  revalidatePath("/app/settings/access");
  return { success: true };
}

// ── getMyActiveProxy ────────────────────────────────────────────────
export async function getMyActiveProxy() {
  const { userId, orgId } = await requireRole("member");

  // Lazy-expire
  await db.proxyGrant.updateMany({
    where: { orgId, status: "ACTIVE", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });

  const grant = await db.proxyGrant.findFirst({
    where: { orgId, actorId: userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!grant) return null;

  const represented = await db.profile.findUnique({
    where: { id: grant.representedId },
    select: { name: true },
  });

  return {
    id: grant.id,
    representedName: represented?.name ?? "Unknown",
    scope: grant.scope,
    expiresAt: grant.expiresAt.toISOString(),
  };
}

// ── getOrgMembersForProxy ───────────────────────────────────────────
export async function getOrgMembersForProxy() {
  const { orgId } = await requireRole("admin");

  const members = await db.member.findMany({
    where: { organizationId: orgId },
    select: {
      userId: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  }));
}
