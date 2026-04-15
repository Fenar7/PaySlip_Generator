import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, hasRole } from "@/lib/auth";
import { refreshSsoMetadata } from "@/lib/sso";

export async function POST(request: NextRequest) {
  try {
    const context = await getOrgContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasRole(context.role, "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await request.json()) as { orgId?: string };
    const orgId = body.orgId ?? context.orgId;

    if (orgId !== context.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await refreshSsoMetadata(orgId, context.userId);
    return NextResponse.json({
      success: true,
      config: {
        metadataStatus: config.metadataStatus,
        metadataError: config.metadataError,
        metadataLastFetchedAt: config.metadataLastFetchedAt?.toISOString() ?? null,
        metadataNextRefreshAt: config.metadataNextRefreshAt?.toISOString() ?? null,
        testedAt: config.testedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("SSO metadata refresh failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to refresh SSO metadata",
      },
      { status: 400 },
    );
  }
}
