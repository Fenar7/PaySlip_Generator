import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { syncInvoices } from "@/lib/integrations/quickbooks";

export async function POST() {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncInvoices(ctx.orgId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("QuickBooks sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
