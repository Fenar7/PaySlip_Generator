import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  deleteSsoConfig,
  getSsoConfig,
  saveSsoConfig,
} from "@/lib/sso";

type SsoProvider = "okta" | "azure" | "google" | "saml_custom";

function normalizeOrgId(request: NextRequest, fallbackOrgId: string): string {
  return request.nextUrl.searchParams.get("orgId") ?? fallbackOrgId;
}

function serializeConfig(config: Awaited<ReturnType<typeof getSsoConfig>>) {
  if (!config) {
    return null;
  }

  return {
    provider: config.provider,
    metadataUrl: config.metadataUrl,
    metadataXml: config.metadataXml,
    acsUrl: config.acsUrl,
    entityId: config.entityId,
    idpEntityId: config.idpEntityId,
    idpSsoUrl: config.idpSsoUrl,
    idpSsoBinding: config.idpSsoBinding,
    metadataStatus: config.metadataStatus,
    metadataError: config.metadataError,
    metadataLastFetchedAt: config.metadataLastFetchedAt?.toISOString() ?? null,
    metadataNextRefreshAt: config.metadataNextRefreshAt?.toISOString() ?? null,
    ssoEnforced: config.ssoEnforced,
    isActive: config.isActive,
    testedAt: config.testedAt?.toISOString() ?? null,
    lastFailureAt: config.lastFailureAt?.toISOString() ?? null,
    lastFailureReason: config.lastFailureReason,
    lastLoginAt: config.lastLoginAt?.toISOString() ?? null,
    lastLoginEmail: config.lastLoginEmail,
    certificateCount: Array.isArray(config.idpCertificates)
      ? config.idpCertificates.length
      : 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getOrgContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasRole(context.role, "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const orgId = normalizeOrgId(request, context.orgId);

    if (orgId !== context.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [config, activeBreakGlassCount] = await Promise.all([
      getSsoConfig(orgId),
      db.ssoBreakGlassCode.count({
        where: {
          orgId,
          redeemedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return NextResponse.json({
      config: serializeConfig(config),
      activeBreakGlassCount,
    });
  } catch (error) {
    console.error("SSO settings GET failed:", error);
    return NextResponse.json(
      { error: "Failed to load SSO settings" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getOrgContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasRole(context.role, "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await request.json()) as {
      orgId?: string;
      provider?: SsoProvider;
      metadataUrl?: string;
      metadataXml?: string;
      ssoEnforced?: boolean;
    };

    const orgId = body.orgId ?? context.orgId;
    if (orgId !== context.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      body.provider !== "okta" &&
      body.provider !== "azure" &&
      body.provider !== "google" &&
      body.provider !== "saml_custom"
    ) {
      return NextResponse.json(
        { error: "A valid SSO provider is required." },
        { status: 400 },
      );
    }

    const saved = await saveSsoConfig({
      orgId,
      actorId: context.userId,
      provider: body.provider,
      metadataUrl: body.metadataUrl,
      metadataXml: body.metadataXml,
      ssoEnforced: body.ssoEnforced === true,
    });

    const activeBreakGlassCount = await db.ssoBreakGlassCode.count({
      where: {
        orgId,
        redeemedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    return NextResponse.json({
      config: serializeConfig(saved),
      activeBreakGlassCount,
    });
  } catch (error) {
    console.error("SSO settings POST failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save SSO settings",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getOrgContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasRole(context.role, "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const orgId = normalizeOrgId(request, context.orgId);

    if (orgId !== context.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteSsoConfig(orgId, context.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SSO settings DELETE failed:", error);
    return NextResponse.json(
      { error: "Failed to delete SSO settings" },
      { status: 400 },
    );
  }
}
