"use server";
import { db } from "@/lib/db";

export async function getPortalSettings(organizationId: string) {
  const defaults = await db.orgDefaults.findUnique({
    where: { organizationId },
    select: {
      portalEnabled: true,
      portalHeaderMessage: true,
      portalSupportEmail: true,
      portalSupportPhone: true,
    },
  });
  return defaults;
}

export async function updatePortalSettings({
  organizationId,
  portalEnabled,
  portalHeaderMessage,
  portalSupportEmail,
  portalSupportPhone,
}: {
  organizationId: string;
  portalEnabled: boolean;
  portalHeaderMessage: string;
  portalSupportEmail: string;
  portalSupportPhone: string;
}) {
  await db.orgDefaults.upsert({
    where: { organizationId },
    create: {
      organizationId,
      portalEnabled,
      portalHeaderMessage: portalHeaderMessage || null,
      portalSupportEmail: portalSupportEmail || null,
      portalSupportPhone: portalSupportPhone || null,
    },
    update: {
      portalEnabled,
      portalHeaderMessage: portalHeaderMessage || null,
      portalSupportEmail: portalSupportEmail || null,
      portalSupportPhone: portalSupportPhone || null,
    },
  });
}

export async function getPortalAccessLogs(
  organizationId: string,
  page = 1,
  pageSize = 20
) {
  const [logs, total] = await Promise.all([
    db.customerPortalAccessLog.findMany({
      where: { orgId: organizationId },
      orderBy: { accessedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
    }),
    db.customerPortalAccessLog.count({
      where: { orgId: organizationId },
    }),
  ]);
  return { logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function revokeAllPortalTokens(organizationId: string) {
  const result = await db.customerPortalToken.updateMany({
    where: { orgId: organizationId, isRevoked: false },
    data: { isRevoked: true },
  });
  return { revokedCount: result.count };
}
