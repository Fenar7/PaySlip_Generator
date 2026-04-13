import { processScheduledActions } from "@/lib/flow/scheduler";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await processScheduledActions();
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[FlowScheduler] cron failed: ", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
