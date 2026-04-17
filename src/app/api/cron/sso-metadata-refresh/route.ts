import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { refreshSsoMetadata } from "@/lib/sso";

export const dynamic = "force-dynamic";

const SYSTEM_ACTOR = "cron-sso-metadata-refresh";

/** Refresh SAML/OIDC metadata for all SSO configs where metadataNextRefreshAt is in the past. */
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();

  try {
    const staleConfigs = await db.ssoConfig.findMany({
      where: {
        metadataUrl: { not: null },
        metadataNextRefreshAt: { lt: new Date() },
      },
      select: { orgId: true },
    });

    let refreshed = 0;
    let failed = 0;

    for (const { orgId } of staleConfigs) {
      try {
        await refreshSsoMetadata(orgId, SYSTEM_ACTOR);
        refreshed++;
      } catch {
        failed++;
      }
    }

    await db.jobLog.create({
      data: {
        jobName: "sso-metadata-refresh",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
        payload: { checked: staleConfigs.length, refreshed, failed },
      },
    });

    return NextResponse.json({ ok: true, checked: staleConfigs.length, refreshed, failed });
  } catch (err) {
    await db.jobLog.create({
      data: {
        jobName: "sso-metadata-refresh",
        jobId,
        status: "failed",
        triggeredAt,
        completedAt: new Date(),
        error: err instanceof Error ? err.message : "Unknown error",
      },
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
