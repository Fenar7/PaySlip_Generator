import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { unsubscribe } from "@/lib/push-notifications";

export async function DELETE(request: Request) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { endpoint?: string };

    if (!body.endpoint) {
      return NextResponse.json(
        { error: "endpoint is required" },
        { status: 400 }
      );
    }

    await unsubscribe(ctx.userId, body.endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push unsubscribe failed:", error);
    return NextResponse.json(
      { error: "Unsubscribe failed" },
      { status: 500 }
    );
  }
}
