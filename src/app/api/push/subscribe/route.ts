import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { subscribe, type PushSubscriptionInput } from "@/lib/push-notifications";

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as PushSubscriptionInput;

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 }
      );
    }

    await subscribe(ctx.userId, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe failed:", error);
    return NextResponse.json(
      { error: "Subscribe failed" },
      { status: 500 }
    );
  }
}
