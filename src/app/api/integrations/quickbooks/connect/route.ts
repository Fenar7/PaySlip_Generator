import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { getAuthUrl } from "@/lib/integrations/quickbooks";

export async function GET() {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = getAuthUrl(ctx.orgId);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("QuickBooks connect failed:", error);
    return NextResponse.json(
      { error: "Failed to initiate connection" },
      { status: 500 }
    );
  }
}
