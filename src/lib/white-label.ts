import "server-only";

import { db } from "@/lib/db";
import { requirePlan } from "@/lib/plans/enforcement";

export async function getWhiteLabelConfig(orgId: string) {
  return db.orgWhiteLabel.findUnique({ where: { orgId } });
}

export async function updateWhiteLabel(
  orgId: string,
  settings: {
    removeBranding?: boolean;
    emailFromName?: string | null;
    emailReplyTo?: string | null;
  }
) {
  if (settings.removeBranding) {
    await requirePlan(orgId, "enterprise");
  }

  return db.orgWhiteLabel.upsert({
    where: { orgId },
    create: {
      orgId,
      removeBranding: settings.removeBranding ?? false,
      emailFromName: settings.emailFromName ?? null,
      emailReplyTo: settings.emailReplyTo ?? null,
    },
    update: {
      removeBranding: settings.removeBranding,
      emailFromName: settings.emailFromName,
      emailReplyTo: settings.emailReplyTo,
    },
  });
}

export async function shouldHideBranding(orgId: string): Promise<boolean> {
  const config = await db.orgWhiteLabel.findUnique({
    where: { orgId },
    select: { removeBranding: true },
  });
  return config?.removeBranding === true;
}
