import { NextResponse } from "next/server";
import {
  normalizeIntegrationConfig,
  type IntegrationConfig,
} from "@/lib/integrations/secrets";
import { db } from "@/lib/db";
import { requireIntegrationAdminRoute } from "../_auth";

const SUPPORTED_PROVIDERS = ["quickbooks", "zoho"] as const;

export async function GET() {
  try {
    const auth = await requireIntegrationAdminRoute();
    if (!auth.ok) {
      return auth.response;
    }

    const integrations = await db.orgIntegration.findMany({
      where: {
        orgId: auth.ctx.orgId,
        provider: { in: [...SUPPORTED_PROVIDERS] },
      },
      select: {
        provider: true,
        isActive: true,
        lastSyncAt: true,
        tokenExpiresAt: true,
        externalOrgId: true,
        config: true,
      },
    });

    const byProvider = new Map(
      integrations.map((integration) => [integration.provider, integration]),
    );

    return NextResponse.json(
      SUPPORTED_PROVIDERS.map((provider) => {
        const integration = byProvider.get(provider);
        const config: IntegrationConfig = normalizeIntegrationConfig(
          integration?.config,
        );

        return {
          provider,
          isActive: integration?.isActive ?? false,
          lastSyncAt: integration?.lastSyncAt?.toISOString() ?? null,
          tokenExpiresAt: integration?.tokenExpiresAt?.toISOString() ?? null,
          externalOrgId: integration?.externalOrgId ?? null,
          connectionStatus:
            config.connectionStatus ??
            (integration?.isActive ? "connected" : "disconnected"),
          lastSyncAttemptAt: config.lastSyncAttemptAt ?? null,
          lastSyncStatus: config.lastSyncStatus ?? null,
          lastSyncError: config.lastSyncError ?? null,
          syncedCount: config.syncedCount ?? null,
          attemptedCount: config.attemptedCount ?? null,
        };
      }),
    );
  } catch (error) {
    console.error("Integration status lookup failed:", error);
    return NextResponse.json(
      { error: "Failed to load integration status" },
      { status: 500 },
    );
  }
}
