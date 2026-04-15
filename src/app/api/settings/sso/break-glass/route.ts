import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { issueBreakGlassCode } from "@/lib/sso";

export async function POST(request: NextRequest) {
  try {
    const context = await getOrgContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (context.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await request.json()) as { orgId?: string };
    const orgId = body.orgId ?? context.orgId;

    if (orgId !== context.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await issueBreakGlassCode(orgId, context.userId);
    return NextResponse.json({
      code: result.code,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Break-glass issue failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to issue a break-glass code",
      },
      { status: 400 },
    );
  }
}
