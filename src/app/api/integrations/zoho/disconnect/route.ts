import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { disconnect } from "@/lib/integrations/zoho";

export async function DELETE() {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await disconnect(ctx.orgId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Zoho disconnect failed:", error);
    return NextResponse.json(
      { error: "Disconnect failed" },
      { status: 500 }
    );
  }
}
