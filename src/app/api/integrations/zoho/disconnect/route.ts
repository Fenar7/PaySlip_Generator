import { NextResponse } from "next/server";
import { disconnect } from "@/lib/integrations/zoho";
import { requireIntegrationAdminRoute } from "../../_auth";

export async function DELETE() {
  try {
    const auth = await requireIntegrationAdminRoute();
    if (!auth.ok) {
      return auth.response;
    }

    await disconnect(auth.ctx.orgId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Zoho disconnect failed:", error);
    return NextResponse.json(
      { error: "Disconnect failed" },
      { status: 500 }
    );
  }
}
