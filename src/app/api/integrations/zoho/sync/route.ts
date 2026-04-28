import { NextResponse } from "next/server";
import { syncInvoices } from "@/lib/integrations/zoho";
import { requireIntegrationAdminRoute } from "../../_auth";

export async function POST() {
  try {
    const auth = await requireIntegrationAdminRoute();
    if (!auth.ok) {
      return auth.response;
    }

    const result = await syncInvoices(auth.ctx.orgId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Zoho sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
